"""
Rule-based threat analyzer with explainable scoring
"""
import numpy as np
from typing import Dict, List, Optional, Tuple
from shapely.geometry import Point, shape
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ThreatAnalyzer:
    """Rule-based threat assessment with weighted scoring"""
    
    # Default weights
    DEFAULT_WEIGHTS = {
        "in_restricted_zone": 40,
        "no_transponder": 25,
        "high_speed": 15,
        "military_classification": 10,
        "low_altitude": 10
    }
    
    # Default thresholds
    DEFAULT_THRESHOLDS = {
        "high_speed_kt": 400,
        "low_altitude_ft": 5000
    }
    
    # Threat levels
    LEVELS = {
        "Low": (0, 25),
        "Medium": (25, 50),
        "High": (50, 70),
        "Critical": (70, 100)
    }
    
    def __init__(
        self,
        zone_polygons_file: Optional[str] = None,
        allowlist_file: Optional[str] = None,
        weights: Optional[Dict[str, int]] = None,
        thresholds: Optional[Dict[str, float]] = None
    ):
        """
        Initialize threat analyzer
        
        Args:
            zone_polygons_file: Path to GeoJSON file with restricted zones
            allowlist_file: Path to CSV file with allowed transponder IDs
            weights: Custom scoring weights
            thresholds: Custom threshold values
        """
        self.weights = weights or self.DEFAULT_WEIGHTS
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS
        
        # Load restricted zones
        self.zones = self._load_zones(zone_polygons_file) if zone_polygons_file else []
        
        # Load allowlist
        self.allowlist = self._load_allowlist(allowlist_file) if allowlist_file else set()
        
        logger.info(f"ThreatAnalyzer initialized with {len(self.zones)} zones and {len(self.allowlist)} allowed IDs")
    
    def _load_zones(self, file_path: str) -> List:
        """Load restricted zones from GeoJSON"""
        if not Path(file_path).exists():
            logger.warning(f"Zone file not found: {file_path}")
            return []
        
        try:
            with open(file_path, 'r') as f:
                geojson = json.load(f)
            
            zones = []
            if geojson.get('type') == 'FeatureCollection':
                for feature in geojson.get('features', []):
                    geometry = shape(feature['geometry'])
                    name = feature.get('properties', {}).get('name', 'Unnamed Zone')
                    zones.append({'name': name, 'geometry': geometry})
            
            logger.info(f"Loaded {len(zones)} restricted zones")
            return zones
            
        except Exception as e:
            logger.error(f"Failed to load zones: {e}")
            return []
    
    def _load_allowlist(self, file_path: str) -> set:
        """Load allowed transponder IDs from CSV"""
        if not Path(file_path).exists():
            logger.warning(f"Allowlist file not found: {file_path}")
            return set()
        
        try:
            import pandas as pd
            df = pd.read_csv(file_path)
            allowlist = set(df['transponder_id'].astype(str).tolist())
            logger.info(f"Loaded {len(allowlist)} allowed transponder IDs")
            return allowlist
        except Exception as e:
            logger.error(f"Failed to load allowlist: {e}")
            return set()
    
    def assess_threat(
        self,
        world_pos: Tuple[float, float],
        speed_kt: float,
        classification: str,
        transponder_id: Optional[str] = None,
        altitude_ft: Optional[float] = None
    ) -> Dict:
        """
        Assess threat level for an aircraft
        
        Args:
            world_pos: World position (x, y) in meters
            speed_kt: Speed in knots
            classification: Aircraft class (fighter, airliner, etc.)
            transponder_id: Transponder ID (None if unknown)
            altitude_ft: Altitude in feet (optional)
            
        Returns:
            Dictionary with:
            - score: Total threat score (0-100)
            - level: Threat level (Low, Medium, High, Critical)
            - reasons: List of contributing factors
            - breakdown: Score breakdown by factor
        """
        score = 0
        reasons = []
        breakdown = {}
        
        # Factor 1: In restricted zone
        in_zone, zone_name = self._check_restricted_zone(world_pos)
        if in_zone:
            score += self.weights["in_restricted_zone"]
            reasons.append(f"inside_restricted_zone ({zone_name})")
            breakdown["zone"] = self.weights["in_restricted_zone"]
        
        # Factor 2: No/unknown transponder
        if not transponder_id or transponder_id not in self.allowlist:
            score += self.weights["no_transponder"]
            reasons.append("unknown_transponder")
            breakdown["transponder"] = self.weights["no_transponder"]
        
        # Factor 3: High speed
        if speed_kt > self.thresholds["high_speed_kt"]:
            score += self.weights["high_speed"]
            reasons.append(f"high_speed ({speed_kt:.0f} kt)")
            breakdown["speed"] = self.weights["high_speed"]
        
        # Factor 4: Military classification
        if classification in ["fighter", "bomber", "military_drone"]:
            score += self.weights["military_classification"]
            reasons.append(f"military_classification ({classification})")
            breakdown["military"] = self.weights["military_classification"]
        
        # Factor 5: Low altitude in zone
        if in_zone and altitude_ft is not None and altitude_ft < self.thresholds["low_altitude_ft"]:
            score += self.weights["low_altitude"]
            reasons.append(f"low_altitude ({altitude_ft:.0f} ft)")
            breakdown["altitude"] = self.weights["low_altitude"]
        
        # Determine threat level
        level = self._get_threat_level(score)
        
        return {
            "score": int(score),
            "level": level,
            "reasons": reasons,
            "breakdown": breakdown
        }
    
    def _check_restricted_zone(self, world_pos: Tuple[float, float]) -> Tuple[bool, Optional[str]]:
        """
        Check if position is in any restricted zone
        
        Args:
            world_pos: World position (x, y)
            
        Returns:
            Tuple of (in_zone, zone_name)
        """
        if not self.zones:
            return False, None
        
        point = Point(world_pos[0], world_pos[1])
        
        for zone in self.zones:
            if zone['geometry'].contains(point):
                return True, zone['name']
        
        return False, None
    
    def _get_threat_level(self, score: int) -> str:
        """
        Map score to threat level
        
        Args:
            score: Threat score (0-100)
            
        Returns:
            Threat level string
        """
        for level, (min_score, max_score) in self.LEVELS.items():
            if min_score <= score < max_score:
                return level
        
        # If score >= 70
        return "Critical"


if __name__ == "__main__":
    # Test threat analyzer
    analyzer = ThreatAnalyzer()
    
    # Test case: unknown aircraft at high speed
    threat = analyzer.assess_threat(
        world_pos=(100.0, 200.0),
        speed_kt=450,
        classification="fighter",
        transponder_id=None,
        altitude_ft=3000
    )
    
    print("Threat Assessment:")
    print(f"  Score: {threat['score']}/100")
    print(f"  Level: {threat['level']}")
    print(f"  Reasons: {threat['reasons']}")
    print(f"  Breakdown: {threat['breakdown']}")
