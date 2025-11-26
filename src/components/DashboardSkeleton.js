import React from 'react';
import Skeleton from './Skeleton';

const DashboardSkeleton = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* 1. Sidebar Skeleton (Hidden on mobile usually, but good to show structure) */}
      <div style={{ 
          width: '260px', 
          background: 'white', 
          borderRight: '1px solid #e2e8f0', 
          padding: '25px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          zIndex: 2
      }} className="desktop-only">
         {/* Logo Area */}
         <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <Skeleton width={40} height={40} borderRadius="10px" />
            <Skeleton width={120} height={24} />
         </div>
         {/* Menu Items */}
         {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <Skeleton width={24} height={24} borderRadius="6px" />
                 <Skeleton width={140} height={16} />
             </div>
         ))}
      </div>

      {/* 2. Main Content Skeleton */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {/* Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
                <Skeleton width={180} height={32} style={{ marginBottom: '10px' }} />
                <Skeleton width={250} height={18} />
            </div>
            <Skeleton width={120} height={40} borderRadius="12px" />
        </div>

        {/* Stats Cards Grid */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
        }}>
            {[1, 2, 3].map((i) => (
                <div key={i} style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                        <Skeleton width={45} height={45} borderRadius="12px" />
                        <div>
                            <Skeleton width={80} height={14} style={{ marginBottom: '6px' }} />
                            <Skeleton width={40} height={24} />
                        </div>
                    </div>
                    <Skeleton width="100%" height={8} />
                </div>
            ))}
        </div>

        {/* Big Table/Section Skeleton */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '300px' }}>
             <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width={150} height={24} />
                <Skeleton width={80} height={24} />
             </div>
             {[1, 2, 3, 4].map((i) => (
                 <div key={i} style={{ marginBottom: '15px', display: 'flex', gap: '20px' }}>
                     <Skeleton width="20%" height={20} />
                     <Skeleton width="30%" height={20} />
                     <Skeleton width="30%" height={20} />
                     <Skeleton width="20%" height={20} />
                 </div>
             ))}
        </div>

      </div>
      
      {/* Mobile Styles Injection */}
      <style>{`
        @media (max-width: 768px) {
            .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardSkeleton;