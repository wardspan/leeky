import requests
import time
import re
import base64
from typing import List, Dict, Optional
from datetime import datetime

class GitHubSearchService:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Leeky-OSINT-Platform/2.0"
        }
        self.rate_limit_delay = 2  # 2 seconds between requests
    
    def search_code(self, query: str, domain: str) -> List[Dict]:
        """Search GitHub for code containing specific patterns"""
        search_url = f"{self.base_url}/search/code"
        params = {
            "q": query,
            "sort": "indexed",
            "order": "desc",
            "per_page": 15  # Reduced to avoid rate limits
        }
        
        try:
            time.sleep(self.rate_limit_delay)  # Rate limiting
            response = requests.get(search_url, headers=self.headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return self.process_search_results(data.get("items", []), domain, query)
            elif response.status_code == 403:
                print(f"Rate limit hit: {response.headers.get('X-RateLimit-Reset')}")
                return []
            elif response.status_code == 422:
                print(f"Invalid search query: {query}")
                return []
            else:
                print(f"GitHub search failed: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"GitHub search error: {str(e)}")
            return []
    
    def process_search_results(self, items: List[Dict], domain: str, original_query: str) -> List[Dict]:
        """Process GitHub search results into standardized format"""
        results = []
        
        for item in items:
            try:
                # Get file content
                content = self.get_file_content(item.get("url", ""))
                if not content:
                    continue
                
                # Extract relevant snippets
                findings = self.extract_findings(content, domain, original_query)
                
                for finding in findings:
                    result = {
                        "repository": item.get("repository", {}).get("full_name", "unknown"),
                        "file_path": item.get("path", ""),
                        "finding": finding["text"],
                        "risk_score": self.calculate_risk_score(finding),
                        "classification": self.classify_finding(finding),
                        "github_url": item.get("html_url", ""),
                        "raw_content": content[:500]  # First 500 chars for context
                    }
                    results.append(result)
                    
            except Exception as e:
                print(f"Error processing search result: {str(e)}")
                continue
        
        return results
    
    def get_file_content(self, file_api_url: str) -> Optional[str]:
        """Get actual file content from GitHub API"""
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(file_api_url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # GitHub returns base64 encoded content
                try:
                    content = base64.b64decode(data.get("content", "")).decode('utf-8')
                    return content
                except:
                    # Handle binary files or encoding issues
                    return None
            return None
            
        except Exception as e:
            print(f"Error fetching file content: {str(e)}")
            return None
    
    def extract_findings(self, content: str, domain: str, query: str) -> List[Dict]:
        """Extract security-relevant findings from file content"""
        findings = []
        lines = content.split('\n')
        
        # Security patterns to look for
        patterns = {
            "api_key": r'(api[_-]?key|apikey)\s*[=:]\s*["\']?([a-zA-Z0-9_-]{20,})["\']?',
            "secret_key": r'(secret[_-]?key|secretkey)\s*[=:]\s*["\']?([a-zA-Z0-9_-]{20,})["\']?',
            "password": r'(password|passwd|pwd)\s*[=:]\s*["\']?([^\s"\']{3,})["\']?',
            "database_url": r'(database[_-]?url|db[_-]?url)\s*[=:]\s*["\']?([^\s"\']+)["\']?',
            "aws_key": r'(aws[_-]?access[_-]?key|AKIA[0-9A-Z]{16})',
            "domain_reference": f'({re.escape(domain)})',
            "github_token": r'(gh[ps]_[a-zA-Z0-9]{36})',
            "jwt_secret": r'(jwt[_-]?secret|token[_-]?secret)\s*[=:]\s*["\']?([a-zA-Z0-9_-]{10,})["\']?',
        }
        
        for line_num, line in enumerate(lines, 1):
            # First, check if this line is relevant to our search
            line_lower = line.lower()
            domain_lower = domain.lower()
            
            # Skip lines that don't contain our domain or security keywords
            if (domain_lower not in line_lower and 
                not any(keyword in line_lower for keyword in 
                       ['password', 'secret', 'key', 'token', 'api', 'auth', 'credential'])):
                continue
            
            for pattern_name, pattern in patterns.items():
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    findings.append({
                        "type": pattern_name,
                        "text": line.strip(),
                        "line_number": line_num,
                        "matched_text": match.group(0)
                    })
        
        # If no specific patterns found but domain is mentioned, add as reference
        if not findings and domain.lower() in content.lower():
            for line_num, line in enumerate(lines, 1):
                if domain.lower() in line.lower():
                    findings.append({
                        "type": "domain_reference",
                        "text": line.strip(),
                        "line_number": line_num,
                        "matched_text": domain
                    })
                    break  # Only add one reference per file
        
        return findings[:5]  # Limit to 5 findings per file
    
    def calculate_risk_score(self, finding: Dict) -> float:
        """Calculate risk score based on finding type and content"""
        risk_scores = {
            "api_key": 9.0,
            "secret_key": 9.2,
            "password": 7.5,
            "database_url": 8.5,
            "aws_key": 9.5,
            "github_token": 9.8,
            "jwt_secret": 8.8,
            "domain_reference": 3.0
        }
        
        base_score = risk_scores.get(finding["type"], 5.0)
        
        # Increase score for production-like keywords
        text_lower = finding["text"].lower()
        if any(keyword in text_lower for keyword in ["prod", "production", "live", "main"]):
            base_score += 1.0
        
        # Decrease score for test/dev keywords
        if any(keyword in text_lower for keyword in ["test", "dev", "example", "demo", "sample"]):
            base_score -= 2.0
        
        # Increase score for file extensions that suggest config files
        if any(ext in finding.get("file_path", "") for ext in [".env", ".config", ".yml", ".yaml", ".json"]):
            base_score += 0.5
        
        return min(max(base_score, 0.0), 10.0)  # Clamp between 0-10
    
    def classify_finding(self, finding: Dict) -> str:
        """Classify the type of security finding"""
        classifications = {
            "api_key": "API Keys & Secrets",
            "secret_key": "API Keys & Secrets", 
            "password": "Credentials & Passwords",
            "database_url": "Database Credentials",
            "aws_key": "Cloud Credentials",
            "github_token": "Version Control Tokens",
            "jwt_secret": "Authentication Secrets",
            "domain_reference": "Domain References"
        }
        
        return classifications.get(finding["type"], "Configuration Files")

def execute_github_dorks(github_token: str, domain: str) -> List[Dict]:
    """Execute predefined GitHub dorks for a domain"""
    service = GitHubSearchService(github_token)
    
    # Dork templates optimized for GitHub search
    dork_templates = [
        f'filename:.env "{domain}"',
        f'"{domain}" password',
        f'"{domain}" api_key',
        f'"{domain}" secret',
        f'filename:config.json "{domain}"',
        f'filename:docker-compose.yml "{domain}"',
        f'"{domain}" database_url',
        f'"{domain}" DB_PASSWORD',
        f'"{domain}" SECRET_KEY',
        f'filename:.yml "{domain}" password'
    ]
    
    all_results = []
    
    for i, dork in enumerate(dork_templates):
        print(f"Executing dork {i+1}/{len(dork_templates)}: {dork}")
        try:
            results = service.search_code(dork, domain)
            all_results.extend(results)
            print(f"Found {len(results)} results for this dork")
            
            # Respect rate limits - increase delay as we make more requests
            time.sleep(3 + (i * 0.5))  # Increasing delay
        except Exception as e:
            print(f"Error executing dork '{dork}': {str(e)}")
            continue
    
    # Remove duplicates based on repository + file_path + finding
    seen = set()
    unique_results = []
    
    for result in all_results:
        key = f"{result['repository']}:{result['file_path']}:{result['finding'][:50]}"
        if key not in seen:
            seen.add(key)
            unique_results.append(result)
    
    # Sort by risk score (highest first)
    unique_results.sort(key=lambda x: x['risk_score'], reverse=True)
    
    # Limit to top 20 results to avoid overwhelming the user
    return unique_results[:20]