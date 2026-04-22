import React from 'react';
import AuctionCard from './AuctionCard';
import { auctions } from '../data/auctions';

const BiddingDashboard: React.FC = () => {
  return (
    <section className="dashboard">
      <div className="section-header">
        <h2 className="section-title">Live Auctions <span className="dot"></span></h2>
        <div className="filters glass">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">Electronics</button>
          <button className="filter-btn">NFTs</button>
          <button className="filter-btn">Collectibles</button>
        </div>
      </div>

      <div className="auction-grid">
        {auctions.map(auction => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>

    </section>
  );
};

export default BiddingDashboard;
