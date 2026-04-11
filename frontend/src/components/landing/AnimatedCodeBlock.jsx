import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { codeSnippets } from '../../data/landing/codeSnippets';

function AnimatedCodeBlock({ activeTab = 0 }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [lines, setLines] = useState([]);
  const [copied, setCopied] = useState(false);
  const transitionRef = useRef(0);
  
  const tabs = [
    { id: 'prompt', label: 'Prompt', code: codeSnippets.prompt },
    { id: 'javascript', label: 'JavaScript', code: codeSnippets.javascript },
    { id: 'python', label: 'Python', code: codeSnippets.python }
  ];

  const currentCode = tabs[currentTab]?.code || '';

  useEffect(() => {
    if (activeTab !== currentTab) {
      transitionToTab(activeTab);
    }
  }, [activeTab]);

  const transitionToTab = async (newTabIndex) => {
    if (newTabIndex === currentTab) return;
    const transitionId = transitionRef.current + 1;
    transitionRef.current = transitionId;

    // Fade out current lines (bottom to top)
    const currentLines = currentCode.split('\n');
    for (let i = currentLines.length - 1; i >= 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 30));
      if (transitionRef.current !== transitionId) return;
      setLines(prev => prev.map((line, idx) => 
        idx === i ? { ...line, opacity: 0 } : line
      ));
    }

    // Switch tab and clear lines
    if (transitionRef.current !== transitionId) return;
    setCurrentTab(newTabIndex);
    setLines([]);

    // Fade in new lines (top to bottom)
    const newLines = tabs[newTabIndex].code.split('\n');
    for (let i = 0; i < newLines.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      if (transitionRef.current !== transitionId) return;
      setLines(prev => [...prev, { 
        text: newLines[i], 
        opacity: 1,
        key: `${newTabIndex}-${i}`
      }]);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Initialize lines on mount
  useEffect(() => {
    const initialLines = currentCode.split('\n').map((line, i) => ({
      text: line,
      opacity: 1,
      key: `${currentTab}-${i}`
    }));
    setLines(initialLines);
  }, []);

  return (
    <div className="animated-code-block">
      <div className="code-header">
        <div className="code-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              className={`code-tab ${i === currentTab ? 'active' : ''}`}
              onClick={() => transitionToTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <button className="copy-button" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={16} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="code-content">
        <div className="scan-line" />
        
        <pre className="code-pre">
          <code>
            {lines.map((line, i) => (
              <motion.div
                key={line.key}
                className="code-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: line.opacity }}
                transition={{ duration: 0.2 }}
              >
                {highlightSyntax(line.text, tabs[currentTab].id)}
              </motion.div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function highlightSyntax(text, language) {
  if (language === 'prompt') {
    return <span className="syntax-plain">{text}</span>;
  }

  // Simple syntax highlighting for JavaScript/Python
  let highlighted = text;
  
  // Strings (single and double quotes)
  highlighted = highlighted.replace(
    /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
    '<span class="syntax-string">$1$2$3</span>'
  );
  
  // Comments
  highlighted = highlighted.replace(
    /(\/\/.*$|#.*$)/gm,
    '<span class="syntax-comment">$1</span>'
  );
  
  // Keywords
  const keywords = language === 'javascript' 
    ? ['import', 'from', 'const', 'await', 'async', 'function', 'return']
    : ['from', 'import', 'async', 'def', 'await', 'return'];
    
  keywords.forEach(keyword => {
    highlighted = highlighted.replace(
      new RegExp(`\\b(${keyword})\\b`, 'g'),
      '<span class="syntax-keyword">$1</span>'
    );
  });

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

export default AnimatedCodeBlock;
