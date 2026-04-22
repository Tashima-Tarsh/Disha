import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="header glass">
      <div className="header-content">
        <div className="logo">
          <span className="logo-text">GO4<span className="gold">BID</span></span>
        </div>
        
        <nav className="nav">
          <a href="#auctions" className="nav-link active">Live Auctions</a>
          <a href="#upcoming" className="nav-link">Upcoming</a>
          <a href="#how-it-works" className="nav-link">How it Works</a>
        </nav>

        <div className="user-actions">
          <div className="balance glass">
            <span className="label">Wallet:</span>
            <span className="amount">$12,450.00</span>
          </div>
          <button className="btn-primary">Connect Wallet</button>
        </div>
      </div>

    </header>
  );
};

export default Header;
