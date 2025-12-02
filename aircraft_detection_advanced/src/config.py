"""
Configuration loader for aircraft detection system
"""
import yaml
from pathlib import Path
from typing import Any, Dict
from dotenv import load_dotenv
import os


class Config:
    """Configuration manager"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Load configuration from YAML file and environment variables
        
        Args:
            config_path: Path to config.yaml file
        """
        self.config_path = Path(config_path)
        load_dotenv()  # Load .env file
        
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(self.config_path, 'r') as f:
            self._config = yaml.safe_load(f)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value with dot notation support
        
        Args:
            key: Configuration key (e.g., 'detector.model_path')
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        keys = key.split('.')
        value = self._config
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default
        
        # Override with environment variable if exists
        env_key = key.upper().replace('.', '_')
        env_value = os.getenv(env_key)
        if env_value is not None:
            return env_value
        
        return value
    
    def get_section(self, section: str) -> Dict[str, Any]:
        """
        Get entire configuration section
        
        Args:
            section: Section name (e.g., 'detector')
            
        Returns:
            Dictionary of section configuration
        """
        return self._config.get(section, {})
    
    @property
    def all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self._config


# Singleton instance
_config = None


def get_config(config_path: str = "config.yaml") -> Config:
    """
    Get or create configuration instance
    
    Args:
        config_path: Path to config file
        
    Returns:
        Config instance
    """
    global _config
    if _config is None:
        _config = Config(config_path)
    return _config
