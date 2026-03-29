document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('phishing-analyzer-form');
  const input = document.getElementById('url-input');
  const resultPanel = document.querySelector('.result-panel');
  const scoreDisplay = document.getElementById('analyzer-score');
  const levelDisplay = document.getElementById('analyzer-level');
  const meterFill = document.getElementById('analyzer-meter-fill');
  const recommendationsList = document.getElementById('analyzer-recommendations');
  const clearBtn = document.getElementById('analyzer-clear');

  if (!form || !input) return;

  function analyzeUrl(url) {
    let score = 100;
    const warnings = [];
    const criticals = [];
    const info = [];

    // Basic formatting
    let parsedUrl;
    try {
      // Add a dummy protocol if missing so URL parser works
      const testUrl = url.startsWith('http') ? url : `http://${url}`;
      parsedUrl = new URL(testUrl);
    } catch (e) {
      return {
        score: 0,
        level: "Invalid Format",
        class: "risk",
        findings: ["The provided text does not appear to be a valid URL."]
      };
    }

    const { hostname, pathname, search, protocol } = parsedUrl;

    // Check 1: IP Address instead of domain
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      score -= 50;
      criticals.push("Uses an IP address instead of a domain name. Highly suspicious for phishing.");
    }

    // Check 2: Too many subdomains
    const domainParts = hostname.split('.');
    if (domainParts.length > 4) {
      score -= 20;
      warnings.push(`Contains ${domainParts.length - 2} subdomains. Attackers often use long subdomains to hide the real domain.`);
    }

    // Check 3: Suspicious Hyphens
    if ((hostname.match(/-/g) || []).length > 2) {
      score -= 15;
      warnings.push("Contains multiple hyphens. Often used to spoof legitimate brands (e.g., paypal-secure-login.com).");
    }

    // Check 4: Suspicious TLDs
    const tld = domainParts[domainParts.length - 1];
    const highRiskTlds = ['tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'vip', 'click'];
    if (highRiskTlds.includes(tld)) {
      score -= 30;
      criticals.push(`Uses a high-risk Top Level Domain (.${tld}). These are commonly abused by cybercriminals.`);
    }

    // Check 5: Free hosting or dynamic DNS
    const suspiciousDomains = ['000webhostapp.com', 'ngrok.io', 'firebaseapp.com', 'herokuapp.com'];
    if (suspiciousDomains.some(d => hostname.endsWith(d))) {
      score -= 25;
      warnings.push("Uses a free hosting or dynamic DNS provider. Legitimate institutions rarely use these for sensitive logins.");
    }

    // Check 6: HTTPS
    if (protocol !== 'https:' && url.startsWith('http:')) {
      score -= 20;
      warnings.push("Does not use HTTPS encryption. All modern secure sites require HTTPS.");
    }

    // Check 7: Brand spoofing in path
    const targetBrands = ['paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'bank', 'login', 'secure', 'verify'];
    const lowerPath = pathname.toLowerCase();
    const isBrandSpoof = targetBrands.some(brand => lowerPath.includes(brand) && !hostname.includes(brand));
    if (isBrandSpoof) {
      score -= 25;
      criticals.push("Contains brand names or security keywords in the URL path, attempting to look official.");
    }
    
    // Check 8: Length of URL
    if (url.length > 100) {
      score -= 10;
      info.push("The URL is very long. This is sometimes used to hide the actual destination.");
    }

    score = Math.max(0, score);
    
    let levelStr = "Low Risk";
    let levelClass = "good";
    if (score < 50) {
      levelStr = "High Risk";
      levelClass = "risk";
    } else if (score < 80) {
      levelStr = "Medium Risk";
      levelClass = "medium";
    }

    const allFindings = [...criticals, ...warnings, ...info];
    if (allFindings.length === 0) {
      allFindings.push("No immediate red flags detected. However, a clean structure does not guarantee the site is safe.");
    }

    return {
      score,
      level: levelStr,
      class: levelClass,
      findings: allFindings
    };
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const urlVal = input.value.trim();
    if (!urlVal) return;

    const result = analyzeUrl(urlVal);
    
    scoreDisplay.textContent = `${result.score} / 100`;
    levelDisplay.textContent = result.level;
    levelDisplay.className = "";
    levelDisplay.classList.add(result.class === 'good' ? 'strong' : result.class === 'medium' ? 'medium' : 'weak');
    
    meterFill.className = "meter-fill";
    if (result.class) meterFill.classList.add(result.class);
    meterFill.style.width = `${result.score}%`;

    recommendationsList.innerHTML = '';
    result.findings.forEach(finding => {
      const li = document.createElement('li');
      li.textContent = finding;
      recommendationsList.appendChild(li);
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      scoreDisplay.textContent = '0 / 100';
      levelDisplay.textContent = 'Unknown';
      levelDisplay.className = '';
      meterFill.className = 'meter-fill';
      meterFill.style.width = '0%';
      recommendationsList.innerHTML = '<li>Enter a URL above to see security analysis.</li>';
    });
  }
});
