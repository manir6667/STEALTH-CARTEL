"""
Unit tests for aircraft classification logic
"""
import pytest
from app.classification import (
    classify_speed,
    get_alert_message,
    is_threat_level_high,
    THRESHOLDS
)


def test_classify_small_aircraft():
    """Test classification of small/slow aircraft"""
    classification, severity = classify_speed(80)
    assert classification == "civilian_prop"
    assert severity == "LOW"


def test_classify_airliner():
    """Test classification of commercial airliner speeds"""
    classification, severity = classify_speed(250)
    assert classification == "airliner"
    assert severity == "MEDIUM"


def test_classify_high_performance():
    """Test classification of high-performance aircraft"""
    classification, severity = classify_speed(450)
    assert classification == "high_performance"
    assert severity == "HIGH"


def test_classify_fighter():
    """Test classification of fighter/attack aircraft"""
    classification, severity = classify_speed(700)
    assert classification == "fighter"
    assert severity == "HIGH"


def test_classify_with_sustained_speed():
    """Test classification using sustained speed window"""
    sustained_speeds = [450, 460, 455, 465]
    classification, severity = classify_speed(500, sustained_speeds)
    # Average is ~457, should be high_performance
    assert classification == "high_performance"
    assert severity == "HIGH"


def test_classify_edge_cases():
    """Test classification at threshold boundaries"""
    # Just below small aircraft threshold
    classification, _ = classify_speed(119)
    assert classification == "civilian_prop"
    
    # Just at threshold
    classification, _ = classify_speed(120)
    assert classification == "airliner"
    
    # Just below commercial threshold
    classification, _ = classify_speed(349)
    assert classification == "airliner"
    
    # Just at commercial threshold
    classification, _ = classify_speed(350)
    assert classification == "high_performance"


def test_classify_invalid_speed():
    """Test classification with invalid negative speed"""
    classification, severity = classify_speed(-10)
    assert classification == "unknown"
    assert severity == "LOW"


def test_get_alert_message():
    """Test alert message generation"""
    msg = get_alert_message("fighter", "ABC123")
    assert "FIGHTER" in msg.upper()
    assert "ABC123" in msg
    
    msg_unknown = get_alert_message("civilian_prop", None)
    assert "UNKNOWN" in msg_unknown


def test_is_threat_level_high():
    """Test threat level detection"""
    assert is_threat_level_high("fighter") == True
    assert is_threat_level_high("high_performance") == True
    assert is_threat_level_high("airliner") == False
    assert is_threat_level_high("civilian_prop") == False


def test_thresholds_consistency():
    """Test that thresholds are properly ordered"""
    assert THRESHOLDS["small_aircraft"] < THRESHOLDS["commercial"]
    assert THRESHOLDS["commercial"] < THRESHOLDS["high_performance"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
