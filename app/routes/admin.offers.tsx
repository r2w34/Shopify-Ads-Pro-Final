import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Mock offers data - in real app, fetch from database
  const offers = [
    {
      id: "OFFER-001",
      title: "New Customer 50% Off",
      description: "50% discount for first-time customers",
      type: "percentage",
      value: 50,
      code: "WELCOME50",
      status: "active",
      startDate: "2024-09-01",
      endDate: "2024-12-31",
      usageLimit: 1000,
      usageCount: 245,
      createdAt: "2024-09-01"
    },
    {
      id: "OFFER-002",
      title: "Holiday Special",
      description: "$25 off orders over $100",
      type: "fixed",
      value: 25,
      code: "HOLIDAY25",
      status: "scheduled",
      startDate: "2024-12-01",
      endDate: "2024-12-31",
      usageLimit: 500,
      usageCount: 0,
      createdAt: "2024-09-10"
    },
    {
      id: "OFFER-003",
      title: "Referral Bonus",
      description: "20% off for referred customers",
      type: "percentage",
      value: 20,
      code: "REFER20",
      status: "active",
      startDate: "2024-08-01",
      endDate: "2024-12-31",
      usageLimit: null,
      usageCount: 89,
      createdAt: "2024-08-01"
    }
  ];

  const stats = {
    totalOffers: offers.length,
    activeOffers: offers.filter(o => o.status === 'active').length,
    totalRedemptions: offers.reduce((sum, o) => sum + o.usageCount, 0),
    totalSavings: 12450.75
  };

  return json({ offers, stats });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create_offer") {
    const offerData = {
      title: formData.get("title"),
      description: formData.get("description"),
      type: formData.get("type"),
      value: Number(formData.get("value")),
      code: formData.get("code"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null
    };

    // In real app, save to database
    console.log("Creating offer:", offerData);

    return json({
      success: true,
      message: "Offer created successfully!"
    });
  }

  if (action === "toggle_status") {
    const offerId = formData.get("offerId");
    const newStatus = formData.get("newStatus");
    
    // In real app, update database
    console.log(`Updating offer ${offerId} status to ${newStatus}`);

    return json({
      success: true,
      message: `Offer status updated to ${newStatus}`
    });
  }

  return json({ success: false, message: "Invalid action" });
};

export default function AdminOffers() {
  const { offers, stats } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "percentage",
    value: "",
    code: "",
    startDate: "",
    endDate: "",
    usageLimit: ""
  });

  const handleSubmit = () => {
    const data = new FormData();
    data.append("action", "create_offer");
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    
    submit(data, { method: "post" });
    setShowCreateModal(false);
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      type: "percentage",
      value: "",
      code: "",
      startDate: "",
      endDate: "",
      usageLimit: ""
    });
  };

  const toggleOfferStatus = (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const data = new FormData();
    data.append("action", "toggle_status");
    data.append("offerId", offerId);
    data.append("newStatus", newStatus);
    
    submit(data, { method: "post" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.025em'
            }}>
              🎁 Offers & Promotions
            </h1>
            <p style={{ 
              fontSize: '18px', 
              opacity: '0.9', 
              margin: '0',
              fontWeight: '400'
            }}>
              Create and manage discount codes, promotions, and special offers
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            + Create New Offer
          </button>
        </div>
      </div>

      {/* Success Message */}
      {actionData?.success && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {actionData.message}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0', fontWeight: '500' }}>
                Total Offers
              </p>
              <p style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#1f2937' }}>
                {stats.totalOffers}
              </p>
            </div>
            <div style={{ fontSize: '32px' }}>🎯</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0', fontWeight: '500' }}>
                Active Offers
              </p>
              <p style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#1f2937' }}>
                {stats.activeOffers}
              </p>
            </div>
            <div style={{ fontSize: '32px' }}>✅</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0', fontWeight: '500' }}>
                Total Redemptions
              </p>
              <p style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#1f2937' }}>
                {stats.totalRedemptions}
              </p>
            </div>
            <div style={{ fontSize: '32px' }}>🎫</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0', fontWeight: '500' }}>
                Total Savings
              </p>
              <p style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#1f2937' }}>
                ${stats.totalSavings.toLocaleString()}
              </p>
            </div>
            <div style={{ fontSize: '32px' }}>💰</div>
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            margin: '0',
            color: '#1f2937'
          }}>
            All Offers
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Offer Details
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Code & Value
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Usage
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Dates
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer, index) => (
                <tr key={offer.id} style={{ 
                  borderBottom: index < offers.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <p style={{ fontWeight: '600', margin: '0 0 4px 0', color: '#1f2937' }}>
                        {offer.title}
                      </p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                        {offer.description}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <p style={{ fontWeight: '600', margin: '0 0 4px 0', color: '#1f2937' }}>
                        {offer.code}
                      </p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                        {offer.type === 'percentage' ? `${offer.value}% off` : `$${offer.value} off`}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }} className={getStatusColor(offer.status)}>
                      {offer.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <p style={{ fontWeight: '600', margin: '0 0 4px 0', color: '#1f2937' }}>
                        {offer.usageCount}
                      </p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                        {offer.usageLimit ? `of ${offer.usageLimit}` : 'unlimited'}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <p style={{ fontSize: '14px', margin: '0 0 4px 0', color: '#1f2937' }}>
                        {offer.startDate}
                      </p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                        to {offer.endDate}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => toggleOfferStatus(offer.id, offer.status)}
                        style={{
                          background: offer.status === 'active' ? '#fee2e2' : '#dcfce7',
                          color: offer.status === 'active' ? '#dc2626' : '#16a34a',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 1.5rem 0' }}>
              Create New Offer
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Offer Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Brief description of the offer"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Discount Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Value
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder={formData.type === 'percentage' ? '50' : '25'}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Promo Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="SUMMER50"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Usage Limit (optional)
                </label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
              <button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.code || !formData.value}
                style={{
                  flex: '1',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  opacity: (!formData.title || !formData.code || !formData.value) ? '0.5' : '1'
                }}
              >
                Create Offer
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: '1',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}