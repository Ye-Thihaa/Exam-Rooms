import React from "react";

export const UiTLogo = ({ size = 200, className = "" }) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer rotated square */}
        <g transform="translate(120, 120) rotate(45) translate(-85, -85)">
          <rect
            x="0"
            y="0"
            width="170"
            height="170"
            fill="#1A7B8E"
            stroke="#FFFFFF"
            strokeWidth="8"
          />
        </g>

        {/* Inner rotated square */}
        <g transform="translate(120, 120) rotate(45) translate(-70, -70)">
          <rect x="0" y="0" width="140" height="140" fill="#2B9AAD" />
        </g>

        {/* Text "UiT" */}
        <text
          x="120"
          y="140"
          fontFamily="serif"
          fontSize="72"
          fontWeight="400"
          fill="#FFFFFF"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="2"
        >
          UiT
        </text>
      </svg>
    </div>
  );
};
