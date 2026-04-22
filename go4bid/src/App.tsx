import Header from './components/Header';
import BiddingDashboard from './components/BiddingDashboard';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <BiddingDashboard />
      </main>
      
      <footer className="footer glass">
        <div className="footer-content">
          <p>© 2026 GO4BID. Premium Bidding Experience.</p>
          <div className="links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
