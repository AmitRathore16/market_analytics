import React, { useState, useEffect } from 'react';
import Chatbot from './components/Chatbot';

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-container">
      <div className="dashboard-section">
        <iframe
          title="final_dashboard"
          className="dashboard-iframe"
          src="https://app.powerbi.com/reportEmbed?reportId=9797d06c-eb5f-456d-b336-e4b0c3caebc5&autoAuth=true&ctid=945ef104-7619-4ac0-aebb-ed348ffd933d"
          frameBorder="0"
          allowFullScreen={true}
        ></iframe>
      </div>
      <Chatbot theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

export default App;
