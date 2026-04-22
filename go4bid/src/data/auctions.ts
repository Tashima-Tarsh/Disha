export interface Auction {
  id: string;
  title: string;
  image: string;
  currentBid: number;
  endTime: string;
  category: string;
  isLive: boolean;
}

export const auctions: Auction[] = [
  {
    id: '1',
    title: 'Cyberpunk Edition Watch',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000',
    currentBid: 1250,
    endTime: new Date(Date.now() + 1000 * 60 * 45).toISOString(), // 45 mins from now
    category: 'Electronics',
    isLive: true
  },
  {
    id: '2',
    title: 'Aetherial Digital Landscape',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000',
    currentBid: 3400,
    endTime: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2 hours from now
    category: 'NFTs',
    isLive: true
  },
  {
    id: '3',
    title: 'Vintage Mech Keyboard',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=1000',
    currentBid: 850,
    endTime: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 mins from now
    category: 'Home Office',
    isLive: true
  },
  {
    id: '4',
    title: 'Void Spacecraft Model',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000',
    currentBid: 5200,
    endTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Ended 1 hour ago
    category: 'Collectibles',
    isLive: false
  }
];
