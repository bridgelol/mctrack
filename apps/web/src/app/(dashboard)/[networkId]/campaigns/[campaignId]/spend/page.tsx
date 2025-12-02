'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface SpendEntry {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  currency: string;
  budgetType: 'daily' | 'total';
  budgetAmount: number;
}

interface SpendResponse {
  campaign: Campaign;
  spends: SpendEntry[];
  totalSpend: number;
}

export default function CampaignSpendPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const campaignId = params.campaignId as string;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery<SpendResponse>({
    queryKey: ['campaign-spend', networkId, campaignId],
    queryFn: () => api.get(`/networks/${networkId}/campaigns/${campaignId}/spend`),
  });

  const addSpendMutation = useMutation({
    mutationFn: (spend: { date: string; amount: number; notes?: string }) =>
      api.post(`/networks/${networkId}/campaigns/${campaignId}/spend`, spend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-spend', networkId, campaignId] });
      setShowModal(false);
    },
  });

  const deleteSpendMutation = useMutation({
    mutationFn: (spendId: string) =>
      api.delete(`/networks/${networkId}/campaigns/${campaignId}/spend/${spendId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-spend', networkId, campaignId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!data) {
    return <div>Campaign not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li><Link href={`/${networkId}/campaigns`}>Campaigns</Link></li>
          <li><Link href={`/${networkId}/campaigns`}>{data.campaign.name}</Link></li>
          <li>Spend Log</li>
        </ul>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Spend Log</h1>
          <p className="text-base-content/60">
            Total: {data.campaign.currency} {data.totalSpend.toFixed(2)}
            {data.campaign.budgetType === 'daily' && (
              <span className="ml-2">
                (Budget: {data.campaign.currency} {data.campaign.budgetAmount.toFixed(2)}/day)
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Log Spend
        </button>
      </div>

      {data.spends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No spend entries yet</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Log your first spend
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Logged</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.spends.map((spend) => (
                <tr key={spend.id}>
                  <td>{new Date(spend.date).toLocaleDateString()}</td>
                  <td>{data.campaign.currency} {spend.amount.toFixed(2)}</td>
                  <td className="text-base-content/60">{spend.notes || '-'}</td>
                  <td className="text-sm text-base-content/60">
                    {new Date(spend.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => deleteSpendMutation.mutate(spend.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Spend Modal */}
      {showModal && (
        <SpendModal
          currency={data.campaign.currency}
          onClose={() => setShowModal(false)}
          onSave={(spend) => addSpendMutation.mutate(spend)}
          isLoading={addSpendMutation.isPending}
        />
      )}
    </div>
  );
}

interface SpendModalProps {
  currency: string;
  onClose: () => void;
  onSave: (data: { date: string; amount: number; notes?: string }) => void;
  isLoading: boolean;
}

function SpendModal({ currency, onClose, onSave, isLoading }: SpendModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: formData.date,
      amount: formData.amount,
      notes: formData.notes || undefined,
    });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Log Spend</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount ({currency})</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Notes (optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="e.g., YouTube ad campaign"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
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
