'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  domainFilter: string;
  startDate: string;
  endDate: string;
  budgetType: 'daily' | 'total';
  budgetAmount: string | number;
  currency: string;
  createdAt: string;
  archivedAt: string | null;
  stats?: {
    attributedPlayers: number;
    totalRevenue: number;
    totalSpend: number;
    roi: number;
  };
}

interface CampaignsResponse {
  campaigns: Campaign[];
}

export default function CampaignsPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const { data, isLoading } = useQuery<CampaignsResponse>({
    queryKey: ['campaigns', networkId, showArchived],
    queryFn: () => api.get(`/networks/${networkId}/campaigns`, {
      params: { includeArchived: showArchived.toString() },
    }),
  });

  const createMutation = useMutation({
    mutationFn: (campaign: Partial<Campaign>) =>
      api.post(`/networks/${networkId}/campaigns`, campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', networkId] });
      setShowModal(false);
      setEditingCampaign(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (campaignId: string) =>
      api.post(`/networks/${networkId}/campaigns/${campaignId}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', networkId] });
    },
  });

  const isActive = (campaign: Campaign) => {
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    return !campaign.archivedAt && now >= start && now <= end;
  };

  const getStatus = (campaign: Campaign) => {
    if (campaign.archivedAt) return { label: 'Archived', class: 'badge-ghost' };
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    if (now < start) return { label: 'Scheduled', class: 'badge-info' };
    if (now > end) return { label: 'Ended', class: 'badge-warning' };
    return { label: 'Active', class: 'badge-success' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex gap-2">
          <label className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className="label-text">Show archived</span>
          </label>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingCampaign(null);
              setShowModal(true);
            }}
          >
            + New Campaign
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : data?.campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No campaigns yet</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.campaigns.map((campaign) => {
            const status = getStatus(campaign);
            return (
              <div key={campaign.id} className="card bg-base-200">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="card-title">
                        {campaign.name}
                        <span className={`badge ${status.class} badge-sm`}>
                          {status.label}
                        </span>
                      </h3>
                      <p className="text-sm text-base-content/60">
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                        {campaign.domainFilter && ` • ${campaign.domainFilter}`}
                      </p>
                    </div>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                        ⋮
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-40">
                        <li>
                          <button onClick={() => {
                            setEditingCampaign(campaign);
                            setShowModal(true);
                          }}>
                            Edit
                          </button>
                        </li>
                        <li>
                          <button onClick={() => window.location.href = `/${networkId}/campaigns/${campaign.id}/spend`}>
                            Log Spend
                          </button>
                        </li>
                        {!campaign.archivedAt && (
                          <li>
                            <button
                              className="text-error"
                              onClick={() => archiveMutation.mutate(campaign.id)}
                            >
                              Archive
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-base-content/60">Budget</div>
                      <div className="font-medium">
                        {campaign.currency} {Number(campaign.budgetAmount).toFixed(2)}
                        <span className="text-xs text-base-content/60 ml-1">
                          {campaign.budgetType === 'daily' ? '/day' : 'total'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-base-content/60">Players</div>
                      <div className="font-medium">{(campaign.stats?.attributedPlayers ?? 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-base-content/60">Revenue</div>
                      <div className="font-medium text-success">
                        ${(campaign.stats?.totalRevenue ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-base-content/60">ROI</div>
                      <div className={`font-medium ${(campaign.stats?.roi ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                        {(campaign.stats?.roi ?? 0) >= 0 ? '+' : ''}{(campaign.stats?.roi ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => {
            setShowModal(false);
            setEditingCampaign(null);
          }}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

interface CampaignModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: (data: Partial<Campaign>) => void;
  isLoading: boolean;
}

function CampaignModal({ campaign, onClose, onSave, isLoading }: CampaignModalProps) {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    domainFilter: campaign?.domainFilter || '',
    startDate: campaign?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: campaign?.endDate?.split('T')[0] || '',
    budgetType: campaign?.budgetType || 'daily',
    budgetAmount: Number(campaign?.budgetAmount) || 0,
    currency: campaign?.currency || 'USD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Partial<Campaign>);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          {campaign ? 'Edit Campaign' : 'New Campaign'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Campaign Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Domain Filter</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g., play.example.com"
              value={formData.domainFilter}
              onChange={(e) => setFormData({ ...formData, domainFilter: e.target.value })}
              required
            />
            <label className="label">
              <span className="label-text-alt">Domain to attribute players joining from this campaign</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Budget Type</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.budgetType}
                onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as 'daily' | 'total' })}
              >
                <option value="daily">Daily</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                min="0"
                step="0.01"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Currency</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
