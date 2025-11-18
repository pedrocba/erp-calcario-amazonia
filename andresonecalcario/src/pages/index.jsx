import Layout from "./Layout.jsx";

import CompanySelector from "./CompanySelector";

import Dashboard from "./Dashboard";

import Products from "./Products";

import Warehouse from "./Warehouse";

import Transfers from "./Transfers";

import Vehicles from "./Vehicles";

import Contacts from "./Contacts";

import Profile from "./Profile";

import ActivityLogs from "./ActivityLogs";

import Settings from "./Settings";

import Requisitions from "./Requisitions";

import Weighing from "./Weighing";

import Fuel from "./Fuel";

import FinancialAccounts from "./FinancialAccounts";

import Transactions from "./Transactions";

import Sales from "./Sales";

import EPIs from "./EPIs";

import ITAssets from "./ITAssets";

import Reports from "./Reports";

import SaleWithdrawals from "./SaleWithdrawals";

import Quotes from "./Quotes";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    CompanySelector: CompanySelector,
    
    Dashboard: Dashboard,
    
    Products: Products,
    
    Warehouse: Warehouse,
    
    Transfers: Transfers,
    
    Vehicles: Vehicles,
    
    Contacts: Contacts,
    
    Profile: Profile,
    
    ActivityLogs: ActivityLogs,
    
    Settings: Settings,
    
    Requisitions: Requisitions,
    
    Weighing: Weighing,
    
    Fuel: Fuel,
    
    FinancialAccounts: FinancialAccounts,
    
    Transactions: Transactions,
    
    Sales: Sales,
    
    EPIs: EPIs,
    
    ITAssets: ITAssets,
    
    Reports: Reports,
    
    SaleWithdrawals: SaleWithdrawals,
    
    Quotes: Quotes,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<CompanySelector />} />
                
                
                <Route path="/CompanySelector" element={<CompanySelector />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Products" element={<Products />} />
                
                <Route path="/Warehouse" element={<Warehouse />} />
                
                <Route path="/Transfers" element={<Transfers />} />
                
                <Route path="/Vehicles" element={<Vehicles />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/ActivityLogs" element={<ActivityLogs />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Requisitions" element={<Requisitions />} />
                
                <Route path="/Weighing" element={<Weighing />} />
                
                <Route path="/Fuel" element={<Fuel />} />
                
                <Route path="/FinancialAccounts" element={<FinancialAccounts />} />
                
                <Route path="/Transactions" element={<Transactions />} />
                
                <Route path="/Sales" element={<Sales />} />
                
                <Route path="/EPIs" element={<EPIs />} />
                
                <Route path="/ITAssets" element={<ITAssets />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/SaleWithdrawals" element={<SaleWithdrawals />} />
                
                <Route path="/Quotes" element={<Quotes />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}