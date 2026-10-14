import re
from typing import List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class SecurityAction(Enum):
    ALLOW = "allow"
    MASK = "mask"
    BLOCK = "block"
    WARN = "warn"


@dataclass
class DetectionResult:
    """Result of a PII detection check."""
    is_detected: bool
    action: SecurityAction
    explanation: str
    detected_type: Optional[str] = None
    masked_value: Optional[str] = None
    original_value: Optional[str] = None  # Original detected value (for backend use, not for logging)


class PIIDetector:
    """Detects PII and other sensitive information in text."""
    
    def __init__(self):
        """Initialize the PII detector with regex patterns."""
        # Compile regex patterns for efficiency
        self.patterns = {
            "aadhaar": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
            "pan": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"),
            "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
            "phone": re.compile(r"\b(?:\+?\d{1,3}[-.\\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
            # API key patterns (common formats)
            "api_key": re.compile(r"\b(?:api[_-]?key|apikey)[\s=:]+[\w\-]{20,}\b", re.IGNORECASE),
            "aws_key": re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"),
            "github_token": re.compile(r"\b(ghp_|gho_|ghu_|ghs_|ghr_)[0-9a-zA-Z]{36}\b"),
            "generic_token": re.compile(r"\b[\w\-]{32,}\b"),
        }
        
        # Actions for different types - can be configured based on sensitivity
        self.actions = {
            "aadhaar": SecurityAction.BLOCK,  # Highly sensitive ID
            "pan": SecurityAction.BLOCK,      # Highly sensitive ID
            "email": SecurityAction.MASK,     # PII but often needed for communication
            "phone": SecurityAction.MASK,     # PII but sometimes needed
            "api_key": SecurityAction.BLOCK,  # Credentials - should be blocked
            "aws_key": SecurityAction.BLOCK,  # Cloud credentials - highly sensitive
            "github_token": SecurityAction.BLOCK, # Source code access - highly sensitive
            "generic_token": SecurityAction.WARN, # Potentially sensitive - warn first
        }
        
        # Explanations for each type
        self.explanations = {
            "aadhaar": "Detected Aadhaar-style identification number",
            "pan": "Detected PAN-format identifier",
            "email": "Detected email address",
            "phone": "Detected phone number",
            "api_key": "Detected potential API key",
            "aws_key": "Detected AWS access key",
            "github_token": "Detected GitHub personal access token",
            "generic_token": "Detected potential security token",
        }
    
    def detect_pii(self, text: str) -> DetectionResult:
        """
        Detect PII in the text and recommend appropriate security action.
        
        Args:
            text: Input text to scan for PII
            
        Returns:
            DetectionResult with detection status, recommended action, explanation, and original/masked values
        """
        if not text or not isinstance(text, str):
            return DetectionResult(
                is_detected=False,
                action=SecurityAction.ALLOW,
                explanation="No text to analyze",
                detected_type=None
            )
        
        # Check each pattern in order of sensitivity
        for pii_type, pattern in self.patterns.items():
            match = pattern.search(text)
            if match:
                original_value = match.group()
                action = self.actions.get(pii_type, SecurityAction.WARN)
                explanation = self.explanations.get(pii_type, f"Detected {pii_type}")
                
                # Create masked version for logging/display (never store raw)
                masked_value = self._mask_value(original_value, pii_type)
                
                return DetectionResult(
                    is_detected=True,
                    action=action,
                    explanation=explanation,
                    detected_type=pii_type,
                    masked_value=masked_value,
                    original_value=original_value
                )
        
        # No PII detected
        return DetectionResult(
            is_detected=False,
            action=SecurityAction.ALLOW,
            explanation="No PII detected",
            detected_type=None
        )
    
    def _mask_value(self, value: str, pii_type: str) -> str:
        """
        Create a masked version of the detected value for safe logging/display.
        Never returns the original sensitive value.
        
        Args:
            value: The original detected value
            pii_type: Type of PII detected
            
        Returns:
            Masked version safe for logging
        """
        if pii_type in ["aadhaar", "pan"]:
            # Show first and last 2 chars, mask middle
            if len(value) > 4:
                return value[:2] + "*" * (len(value) - 4) + value[-2:]
            else:
                return "*" * len(value)
        elif pii_type == "email":
            # Mask email: first char + ***@***.domain
            if "@" in value:
                local, domain = value.split("@", 1)
                if len(local) > 1:
                    masked_local = local[0] + "*" * (len(local) - 1)
                else:
                    masked_local = "*" * len(local)
                return masked_local + "@" + domain
            else:
                return "*" * len(value)
        elif pii_type in ["api_key", "aws_key", "github_token", "generic_token"]:
            # Mask tokens: show first and last 4 chars
            if len(value) > 8:
                return value[:4] + "*" * (len(value) - 8) + value[-4:]
            else:
                return "*" * len(value)
        else:
            # Default masking
            return "*" * len(value)
    
    def get_detection_summary(self, text: str) -> dict:
        """
        Get a summary of all PII detections in the text (for logging/debugging).
        Never returns actual sensitive values.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with detection counts and masked examples
        """
        if not text or not isinstance(text, str):
            return {"detections": []}
        
        detections = []
        temp_text = text  # Work on a copy to avoid modifying original during iteration
        
        # Find all matches for each type
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(temp_text)
            for match in matches:
                detections.append({
                    "type": pii_type,
                    "action": self.actions.get(pii_type, SecurityAction.WARN).value,
                    "explanation": self.explanations.get(pii_type, f"Detected {pii_type}"),
                    "masked_value": self._mask_value(match, pii_type)
                })
                
                # Remove this match from temp_text to avoid double counting
                # (simple approach - replace first occurrence)
                temp_text = temp_text.replace(match, "[REDACTED]", 1)
        
        return {"detections": detections}


# Convenience function for easy usage
def detect_pii(text: str) -> DetectionResult:
    """
    Convenience function to detect PII in text.
    
    Args:
        text: Input text to scan
        
    Returns:
        DetectionResult
    """
    detector = PIIDetector()
    return detector.detect_pii(text)


if __name__ == "__main__":
    # Simple test
    test_cases = [
        "Hello world",
        "My email is test@example.com",
        "My Aadhaar number is 1234 5678 9012",
        "My PAN is ABCDE1234F",
        "My phone is +1-555-123-4567",
        "API key: sk-1234567890abcdef1234567890abcdef",
    ]
    
    detector = PIIDetector()
    for test in test_cases:
        result = detector.detect_pii(test)
        print(f"Input: {test}")
        print(f"Detected: {result.is_detected}")
        if result.is_detected:
            print(f"Type: {result.detected_type}")
            print(f"Action: {result.action.value}")
            print(f"Explanation: {result.explanation}")
            print(f"Original: {result.original_value}")
            print(f"Masked: {result.masked_value}")
        print("-" * 50)
