
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import BrandSetup from "./pages/BrandSetup";
import Guidelines from "./pages/Guidelines";
import NewReview from "./pages/NewReview";
import ReviewReport from "./pages/ReviewReport";
import ApprovalQueue from "./pages/ApprovalQueue";
import ReviewHistory from "./pages/ReviewHistory";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="app-header">
          <h2>BrandGuard AI</h2>

          <nav className="app-nav">
            <a href="/">Dashboard</a>
            <a href="/brands">Brands</a>
            <a href="/guidelines">Guidelines</a>
            <a href="/reviews/new">New Review</a>
            <a href="/approvals">Approval Queue</a>
            <a href="/history">Review History</a>
          </nav>
        </header>

        <div className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brands" element={<BrandSetup />} />
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/reviews/new" element={<NewReview />} />
            <Route path="/reviews/:reviewId" element={<ReviewReport />} />
            <Route path="/approvals" element={<ApprovalQueue />} />
            <Route path="/history" element={<ReviewHistory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
