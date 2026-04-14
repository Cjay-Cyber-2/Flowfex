import React from 'react';
import { Check, Minus } from 'lucide-react';
import { comparisonFeatures } from '../../data/landing/pricing';

function FeatureComparisonTable() {
  return (
    <div className="feature-comparison">
      <table className="feature-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free</th>
            <th>Pro</th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          {comparisonFeatures.map((feature, i) => (
            <tr key={i} className={i % 2 === 0 ? 'even' : 'odd'}>
              <td className="feature-name">{feature.name}</td>
              <td className="feature-value">
                {renderFeatureValue(feature.free)}
              </td>
              <td className="feature-value">
                {renderFeatureValue(feature.pro)}
              </td>
              <td className="feature-value">
                {renderFeatureValue(feature.team)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderFeatureValue(value) {
  if (value === true) {
    return <Check size={18} className="check-icon" />;
  }
  if (value === false) {
    return <Minus size={18} className="minus-icon" />;
  }
  return <span className="feature-text">{value}</span>;
}

export default FeatureComparisonTable;
