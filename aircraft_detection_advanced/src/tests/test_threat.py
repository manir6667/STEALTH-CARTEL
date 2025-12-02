"""
Unit tests for threat analysis
"""
import pytest
import json
from pathlib import Path
from shapely.geometry import Polygon

from src.threat_analyzer import ThreatAnalyzer


class TestThreatAnalyzer:
    """Test threat analysis"""
    
    @pytest.fixture
    def basic_analyzer(self):
        """Basic threat analyzer without zones"""
        return ThreatAnalyzer()
    
    @pytest.fixture
    def test_zones_file(self, tmp_path):
        """Create test GeoJSON zones file"""
        zones = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "restricted_zone"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
                    }
                }
            ]
        }
        
        zones_file = tmp_path / "zones.geojson"
        with open(zones_file, 'w') as f:
            json.dump(zones, f)
        
        return str(zones_file)
    
    @pytest.fixture
    def test_allowlist_file(self, tmp_path):
        """Create test allowlist file"""
        allowlist = tmp_path / "allowlist.csv"
        with open(allowlist, 'w') as f:
            f.write("transponder_id,description\n")
            f.write("ABC123,Commercial Flight\n")
            f.write("XYZ789,Authorized Aircraft\n")
        
        return str(allowlist)
    
    def test_initialization_defaults(self, basic_analyzer):
        """Test initialization with default parameters"""
        assert basic_analyzer.weights['zone'] == 40
        assert basic_analyzer.weights['transponder'] == 25
        assert basic_analyzer.weights['speed'] == 15
        assert basic_analyzer.weights['military'] == 10
        assert basic_analyzer.weights['altitude'] == 10
        
        assert basic_analyzer.thresholds['Low'] == (0, 25)
        assert basic_analyzer.thresholds['Critical'] == (70, 100)
    
    def test_assess_threat_minimal(self, basic_analyzer):
        """Test threat assessment with minimal risk"""
        threat = basic_analyzer.assess_threat(
            world_pos=(500, 500),  # Outside any zones
            speed_kt=200,  # Normal cruise speed
            classification='airliner',
            transponder_id='ABC123',  # Will be on allowlist if loaded
            altitude_ft=10000
        )
        
        assert threat['score'] >= 0
        assert threat['score'] <= 100
        assert threat['level'] in ['Low', 'Medium', 'High', 'Critical']
        assert isinstance(threat['reasons'], list)
        assert 'breakdown' in threat
    
    def test_assess_threat_high_speed(self, basic_analyzer):
        """Test threat assessment with high speed"""
        threat = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=600,  # Very high speed
            classification='fighter',
            transponder_id=None,
            altitude_ft=5000
        )
        
        # High speed should contribute to threat score
        assert threat['breakdown']['speed'] > 0
    
    def test_assess_threat_military(self, basic_analyzer):
        """Test threat assessment for military aircraft"""
        threat_military = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=300,
            classification='fighter',
            transponder_id=None,
            altitude_ft=8000
        )
        
        threat_civilian = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=300,
            classification='airliner',
            transponder_id=None,
            altitude_ft=8000
        )
        
        # Military should have higher threat score
        assert threat_military['breakdown']['military'] > threat_civilian['breakdown']['military']
    
    def test_assess_threat_no_transponder(self, basic_analyzer):
        """Test threat assessment without transponder"""
        threat = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=300,
            classification='unknown',
            transponder_id=None,
            altitude_ft=5000
        )
        
        # No transponder should add maximum transponder penalty
        assert threat['breakdown']['transponder'] == basic_analyzer.weights['transponder']
        assert 'No transponder signal' in threat['reasons']
    
    def test_assess_threat_with_allowlist(self, basic_analyzer, test_allowlist_file):
        """Test threat assessment with allowlisted transponder"""
        analyzer = ThreatAnalyzer(allowlist_file=test_allowlist_file)
        
        threat_allowed = analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=300,
            classification='airliner',
            transponder_id='ABC123',  # On allowlist
            altitude_ft=10000
        )
        
        threat_not_allowed = analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=300,
            classification='airliner',
            transponder_id='UNKNOWN',  # Not on allowlist
            altitude_ft=10000
        )
        
        # Allowlisted should have lower transponder score
        assert threat_allowed['breakdown']['transponder'] < threat_not_allowed['breakdown']['transponder']
    
    def test_assess_threat_in_restricted_zone(self, test_zones_file):
        """Test threat assessment inside restricted zone"""
        analyzer = ThreatAnalyzer(zone_polygons_file=test_zones_file)
        
        threat_inside = analyzer.assess_threat(
            world_pos=(50, 50),  # Inside zone [0,0] to [100,100]
            speed_kt=250,
            classification='airliner',
            transponder_id='ABC123',
            altitude_ft=8000
        )
        
        threat_outside = analyzer.assess_threat(
            world_pos=(200, 200),  # Outside zone
            speed_kt=250,
            classification='airliner',
            transponder_id='ABC123',
            altitude_ft=8000
        )
        
        # Inside zone should have higher score
        assert threat_inside['breakdown']['zone'] > threat_outside['breakdown']['zone']
        assert 'Inside restricted zone' in threat_inside['reasons']
    
    def test_assess_threat_low_altitude(self, basic_analyzer):
        """Test threat assessment with low altitude"""
        threat_low = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=250,
            classification='airliner',
            transponder_id='ABC123',
            altitude_ft=500  # Very low
        )
        
        threat_high = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=250,
            classification='airliner',
            transponder_id='ABC123',
            altitude_ft=15000  # High altitude
        )
        
        # Low altitude should have higher score
        assert threat_low['breakdown']['altitude'] > threat_high['breakdown']['altitude']
    
    def test_threat_level_classification(self, basic_analyzer):
        """Test threat level classification"""
        # Low threat (0-25)
        threat_low = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=200,
            classification='airliner',
            transponder_id='ABC123',
            altitude_ft=30000
        )
        
        # Should be Low
        assert threat_low['level'] == 'Low' or threat_low['score'] < 25
        
        # Critical threat (70-100)
        threat_critical = basic_analyzer.assess_threat(
            world_pos=(50, 50),  # If zones loaded, would be inside
            speed_kt=700,  # Very high speed
            classification='fighter',
            transponder_id=None,  # No transponder
            altitude_ft=300  # Very low
        )
        
        # Should have high score
        assert threat_critical['score'] > 50
    
    def test_custom_weights(self):
        """Test threat analyzer with custom weights"""
        custom_weights = {
            'zone': 50,
            'transponder': 30,
            'speed': 10,
            'military': 5,
            'altitude': 5
        }
        
        analyzer = ThreatAnalyzer(weights=custom_weights)
        
        assert analyzer.weights == custom_weights
    
    def test_custom_thresholds(self):
        """Test threat analyzer with custom thresholds"""
        custom_thresholds = {
            'Low': (0, 20),
            'Medium': (20, 40),
            'High': (40, 60),
            'Critical': (60, 100)
        }
        
        analyzer = ThreatAnalyzer(thresholds=custom_thresholds)
        
        assert analyzer.thresholds == custom_thresholds
    
    def test_reasons_generation(self, basic_analyzer):
        """Test that reasons are generated correctly"""
        threat = basic_analyzer.assess_threat(
            world_pos=(500, 500),
            speed_kt=600,
            classification='fighter',
            transponder_id=None,
            altitude_ft=500
        )
        
        # Should have multiple reasons
        assert len(threat['reasons']) > 0
        
        # Check for specific reasons
        reasons_text = ' '.join(threat['reasons'])
        assert 'speed' in reasons_text.lower() or 'No transponder' in reasons_text
    
    def test_score_bounds(self, basic_analyzer):
        """Test that threat score is always in valid range"""
        # Test many random scenarios
        test_cases = [
            ((0, 0), 100, 'drone', None, 100),
            ((1000, 1000), 900, 'fighter', None, 200),
            ((500, 500), 250, 'airliner', 'ABC123', 35000),
            ((50, 50), 500, 'unknown', None, 1000),
        ]
        
        for world_pos, speed_kt, classification, transponder_id, altitude_ft in test_cases:
            threat = basic_analyzer.assess_threat(
                world_pos, speed_kt, classification, transponder_id, altitude_ft
            )
            
            assert 0 <= threat['score'] <= 100, f"Score {threat['score']} out of bounds"
            assert threat['level'] in ['Low', 'Medium', 'High', 'Critical']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
