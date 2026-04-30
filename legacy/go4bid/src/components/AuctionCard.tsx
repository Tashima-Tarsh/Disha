import React, { useState, useEffect } from 'react';
import type { Auction } from '../data/auctions';

interface Props {
  auction: Auction;
}

const AuctionCard: React.FC<Props> = ({ auction }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('ENDED');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction.endTime]);

  return (
    <div className={`auction-card glass animate-in ${!auction.isLive ? 'ended' : ''}`}>
      <div className="card-image">
        <img src={auction.image} alt={auction.title} />
        <div className="category-badge">{auction.category}</div>
        {auction.isLive && <div className="live-badge">LIVE</div>}
      </div>

      <div className="card-content">
        <h3 className="card-title">{auction.title}</h3>
        
        <div className="bid-info">
          <div className="bid-box">
            <span className="label">Current Bid</span>
            <span className="value">${auction.currentBid.toLocaleString()}</span>
          </div>
          <div className="time-box">
            <span className="label">Time Remaining</span>
            <span className="value countdown">{timeLeft}</span>
          </div>
        </div>

        <div className="card-actions">
          <button className="btn-bid" disabled={!auction.isLive}>
            {auction.isLive ? 'Place Bid' : 'Auction Closed'}
          </button>
          <button className="btn-details">View Details</button>
        </div>
      </div>

    </div>
  );
};

export default AuctionCard;
