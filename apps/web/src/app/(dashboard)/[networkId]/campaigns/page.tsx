'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, Badge, Modal } from '@/components/ui';
import { Plus, MoreVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  domainFilter: string;
  startTime: string;
  endTime: string;
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
    mutationFn: (campaign: Partial<Campaign>) => {
      // Convert datetime-local format to ISO with timezone for backend validation
      const toISO = (value: string | undefined) => {
        if (!value) return undefined;
        // If already ISO format with timezone, return as-is
        if (value.includes('Z') || value.includes('+')) return value;
        // Convert datetime-local format to ISO
        return new Date(value).toISOString();
      };
      const payload = {
        ...campaign,
        startTime: toISO(campaign.startTime),
        endTime: toISO(campaign.endTime),
      };
      return api.post(`/networks/${networkId}/campaigns`, payload);
    },
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

  const getStatus = (campaign: Campaign) => {
    if (campaign.archivedAt) return { label: 'Archived', variant: 'gray' as const };
    const now = new Date();
    const start = new Date(campaign.startTime);
    const end = new Date(campaign.endTime);
    if (now < start) return { label: 'Scheduled', variant: 'brand' as const };
    if (now > end) return { label: 'Ended', variant: 'warning' as const };
    return { label: 'Active', variant: 'success' as const };
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-50">Campaigns</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-brand-500 focus:ring-brand-500"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className="text-sm text-gray-400">Show archived</span>
          </label>
          <Button
            size="sm"
            onClick={() => {
              setEditingCampaign(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : data?.campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No campaigns yet</p>
          <Button onClick={() => setShowModal(true)}>
            Create your first campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.campaigns.map((campaign) => {
            const status = getStatus(campaign);
            return (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-50">
                          {campaign.name}
                        </h3>
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatDateTime(campaign.startTime)} - {formatDateTime(campaign.endTime)}
                        {campaign.domainFilter && ` • ${campaign.domainFilter}`}
                      </p>
                    </div>
                    <div className="relative group">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      <div className="absolute right-0 mt-2 w-40 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                          onClick={() => {
                            setEditingCampaign(campaign);
                            setShowModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                          onClick={() => window.location.href = `/${networkId}/campaigns/${campaign.id}/spend`}
                        >
                          Log Spend
                        </button>
                        {!campaign.archivedAt && (
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-error-400 hover:bg-gray-700"
                            onClick={() => archiveMutation.mutate(campaign.id)}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-400">Budget</div>
                      <div className="font-medium text-gray-50">
                        {campaign.currency} {Number(campaign.budgetAmount).toFixed(2)}
                        <span className="text-xs text-gray-400 ml-1">
                          {campaign.budgetType === 'daily' ? '/day' : 'total'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Players</div>
                      <div className="font-medium text-gray-50">{(campaign.stats?.attributedPlayers ?? 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Revenue</div>
                      <div className="font-medium text-success-400">
                        ${(campaign.stats?.totalRevenue ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">ROI</div>
                      <div className={cn(
                        'font-medium',
                        (campaign.stats?.roi ?? 0) >= 0 ? 'text-success-400' : 'text-error-400'
                      )}>
                        {(campaign.stats?.roi ?? 0) >= 0 ? '+' : ''}{(campaign.stats?.roi ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
            createMutation.reset();
          }}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
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
  error?: string | null;
}

function CampaignModal({ campaign, onClose, onSave, isLoading, error }: CampaignModalProps) {
  // Helper to format datetime for input
  const toDateTimeLocal = (value: string | undefined) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    domainFilter: campaign?.domainFilter || '',
    startTime: toDateTimeLocal(campaign?.startTime) || new Date().toISOString().slice(0, 16),
    endTime: toDateTimeLocal(campaign?.endTime) || '',
    budgetType: campaign?.budgetType || 'daily',
    budgetAmount: Number(campaign?.budgetAmount) || 0,
    currency: campaign?.currency || 'USD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Partial<Campaign>);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={campaign ? 'Edit Campaign' : 'New Campaign'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm">
            {error}
          </div>
        )}
        <Input
          label="Campaign Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Domain Filter"
          type="text"
          placeholder="e.g., play.example.com"
          value={formData.domainFilter}
          onChange={(e) => setFormData({ ...formData, domainFilter: e.target.value })}
          hint="Domain to attribute players joining from this campaign"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={formData.endTime}
            min={formData.startTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Budget Type"
            value={formData.budgetType}
            onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as 'daily' | 'total' })}
          >
            <option value="daily">Daily</option>
            <option value="total">Total</option>
          </Select>

          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.budgetAmount}
            onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) })}
            required
          />

          <Select
            label="Currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
