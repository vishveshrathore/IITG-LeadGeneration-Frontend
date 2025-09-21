import React from 'react';
import { FaUserShield } from "react-icons/fa";

const OrgChartNode = ({ node }) => {
  // Hide Admin node in the hierarchy tree
  if (node.role === "Admin") return null;
  if (node.role === "LG") return null;

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center relative z-10 p-2 md:p-4">
      {/* Node Card - Responsive and Enhanced */}
      <div className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-blue-200 bg-white shadow-xl transition-all duration-300 w-36 md:w-48 lg:w-56 transform hover:scale-105 hover:shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-full p-2 md:p-3 shadow-lg ring-1 ring-blue-300 ring-opacity-80">
          <FaUserShield className="text-xl md:text-2xl text-white" />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm md:text-base">{node.name}</p>
          <p className="text-xs md:text-sm text-blue-700 font-semibold">{node.role}</p>
          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{node.email}</p>
        </div>
      </div>

      {/* Children & Connecting Lines */}
      {hasChildren && (
        <div className="relative w-full">
          {/* Main Vertical Line Down from Parent */}
          <div className="absolute top-0 left-1/2 h-8 w-0.5 bg-blue-400 -translate-x-1/2"></div>
          
          {/* Horizontal Connector Line for all children */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-blue-400"></div>

          {/* Children Nodes Container */}
          <div className="flex justify-center pt-10 md:pt-12 gap-6 md:gap-12 relative z-10">
            {node.children.map(child => (
              <div key={child._id} className="relative flex flex-col items-center">
                {/* Individual Vertical Line Up to Child */}
                <div className="absolute bottom-full left-1/2 h-6 w-0.5 bg-blue-400 -translate-x-1/2">
                  {/* Subtle dot at the connection point */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                </div>
                <OrgChartNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartNode;