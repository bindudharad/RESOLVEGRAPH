"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import {
  Building2,
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  caseCount: number;
  userRole: string | null;
}

interface OrgMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  globalRole: string;
  orgRole: string;
  joinedAt: string;
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  caseCount: number;
  memberCount: number;
  userRole: string;
  canManage: boolean;
  members: OrgMember[];
  pendingInvitations: OrgInvitation[];
}

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MERCHANT_AGENT");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Create Org modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/organizations");
      if (res.status === 401) {
        setError("Authentication required: Please sign in with a merchant or administrator account.");
        setOrgs([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load organizations");
      const data = await res.json();
      setOrgs(data.organizations || []);
      if (data.organizations?.length > 0) {
        setSelectedOrgId((prev) => prev || data.organizations[0].id);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to retrieve organization workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrgDetails = useCallback(async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error("Failed to load organization details");
      const data = await res.json();
      setActiveOrg(data.organization);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/organizations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.organizations) {
          setOrgs(data.organizations);
          if (data.organizations.length > 0) {
            setSelectedOrgId(data.organizations[0].id);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    let active = true;
    fetch(`/api/organizations/${selectedOrgId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.organization) {
          setActiveOrg(data.organization);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      active = false;
    };
  }, [selectedOrgId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !inviteEmail) return;

    setInviteLoading(true);
    setInviteFeedback(null);

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteFeedback({ error: data.error || "Failed to issue invitation" });
      } else {
        setInviteFeedback({
          success: data.status === "MEMBER_ADDED"
            ? `Existing user ${inviteEmail} was added as an active member!`
            : `Invitation sent to ${inviteEmail}!`,
        });
        setInviteEmail("");
        fetchOrgDetails(selectedOrgId);
        fetchOrganizations();
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteFeedback(null);
        }, 1800);
      }
    } catch (err: unknown) {
      console.error(err);
      setInviteFeedback({ error: "Network error while sending invitation." });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!selectedOrgId) return;
    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchOrgDetails(selectedOrgId);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update member role");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedOrgId) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchOrgDetails(selectedOrgId);
        fetchOrganizations();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove member");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, description: newOrgDesc }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewOrgName("");
        setNewOrgDesc("");
        setCreateModalOpen(false);
        await fetchOrganizations();
        setSelectedOrgId(data.organization.id);
      } else {
        alert(data.error || "Failed to create organization");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--color-brand)]" />
            <h1 className="text-xl font-bold tracking-tight text-fg">
              Multi-Tenant Organizations
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Manage merchant enterprise domains, team roles, and case tenancy boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganizations}
            className="text-[12.5px]"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-[12.5px]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span>New Organization</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Organization Tabs / Grid */}
      {orgs.length === 0 ? (
        <Card className="border-line bg-surface/50 p-8 text-center">
          <CardContent className="flex flex-col items-center justify-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-fg">No Merchant Workspaces Found</h3>
            <p className="max-w-md text-xs text-muted">
              You are currently signed in as an individual user or buyer without merchant organization memberships. Multi-tenant workspaces are scoped to merchant accounts and organization administrators.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                <span>Create Merchant Organization</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrganizations}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span>Refresh Status</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => {
              const isSelected = selectedOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] shadow-md"
                      : "border-line bg-surface hover:border-line-2 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-fg text-[14.5px]">{org.name}</span>
                    {org.userRole && (
                      <Badge tone={org.userRole === "OWNER" ? "warning" : "brand"}>
                        {org.userRole}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-muted line-clamp-2">
                    {org.description || "No description provided."}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-[11.5px] text-faint">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{org.memberCount} members</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      <span>{org.caseCount} cases</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Organization Details & Member Management */}
          {activeOrg && (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{activeOrg.name}</CardTitle>
                      <code className="rounded border border-line bg-[#090f1e] px-2 py-0.5 text-[11px] text-faint font-mono">
                        slug: {activeOrg.slug}
                      </code>
                    </div>
                    <CardDescription className="mt-1">
                      {activeOrg.description || "Enterprise workspace domain"}
                    </CardDescription>
                  </div>

                  {activeOrg.canManage && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setInviteModalOpen(true)}
                      className="text-[12.5px]"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      <span>Invite Team Member</span>
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-fg flex items-center gap-2">
                      <Users className="h-4 w-4 text-[var(--color-brand)]" />
                      <span>Organization Members ({activeOrg.members.length})</span>
                    </h3>
                    <span className="text-[11.5px] text-faint">
                      Tenant Access Scoped to {activeOrg.name}
                    </span>
                  </div>

                  {/* Members Table */}
                  <div className="overflow-x-auto rounded-lg border border-line bg-[#080d1a]">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="border-b border-line bg-[#0c1424] text-[11.5px] font-medium text-muted">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Global Role</th>
                      <th className="px-4 py-3">Organization Role</th>
                      <th className="px-4 py-3">Joined Date</th>
                      {activeOrg.canManage && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {activeOrg.members.map((member) => {
                      const isCurrentUser = session?.user?.email === member.email;
                      return (
                        <tr key={member.membershipId} className="hover:bg-surface-2/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/20 font-semibold text-[11px] text-[var(--color-brand)]">
                                {member.name.charAt(0)}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium text-fg flex items-center gap-1.5">
                                  {member.name}
                                  {isCurrentUser && (
                                    <span className="text-[10px] text-faint">(You)</span>
                                  )}
                                </span>
                                <span className="text-[11px] text-faint">{member.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-muted">
                            <span className="font-mono text-[11px]">{member.globalRole}</span>
                          </td>

                          <td className="px-4 py-3">
                            {activeOrg.canManage && !isCurrentUser ? (
                              <Select
                                value={member.orgRole}
                                onChange={(e) => handleUpdateRole(member.membershipId, e.target.value)}
                                className="h-8 py-0 text-[11.5px]"
                              >
                                <option value="VIEWER">VIEWER</option>
                                <option value="MERCHANT_AGENT">MERCHANT_AGENT</option>
                                <option value="RESOLUTION_MANAGER">RESOLUTION_MANAGER</option>
                                <option value="ORG_ADMIN">ORG_ADMIN</option>
                                <option value="OWNER">OWNER</option>
                              </Select>
                            ) : (
                              <Badge tone={member.orgRole === "OWNER" ? "warning" : "brand"}>
                                {member.orgRole}
                              </Badge>
                            )}
                          </td>

                          <td className="px-4 py-3 text-faint">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>

                          {activeOrg.canManage && (
                            <td className="px-4 py-3 text-right">
                              {!isCurrentUser && member.orgRole !== "OWNER" && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.membershipId, member.name)}
                                  className="rounded p-1 text-faint hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pending Invitations */}
              {activeOrg.pendingInvitations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-[13px] font-semibold text-muted mb-2">
                    Pending Invitations ({activeOrg.pendingInvitations.length})
                  </h4>
                  <div className="rounded-lg border border-line bg-[#080d1a] divide-y divide-line/60">
                    {activeOrg.pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 text-[12px]"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-fg">{inv.email}</span>
                          <span className="text-[10.5px] text-faint">
                            Role: {inv.role} • Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge tone="neutral">Pending Acceptance</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg">Invite Team Member</h3>
            <p className="mt-1 text-[12.5px] text-muted">
              Add a new merchant representative or dispute manager to this workspace.
            </p>

            <form onSubmit={handleSendInvite} className="mt-4 flex flex-col gap-4">
              {inviteFeedback?.error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[12px] text-red-300">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{inviteFeedback.error}</span>
                </div>
              )}
              {inviteFeedback?.success && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[12px] text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{inviteFeedback.success}</span>
                </div>
              )}

              <Field label="Colleague Email Address" htmlFor="inviteEmail" required>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="agent@merchant.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Assigned Role" htmlFor="inviteRole" required>
                <Select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="MERCHANT_AGENT">MERCHANT_AGENT (Handle cases & evidence)</option>
                  <option value="RESOLUTION_MANAGER">RESOLUTION_MANAGER (Propose remedies & review)</option>
                  <option value="VIEWER">VIEWER (Read-only case observation)</option>
                  <option value="ORG_ADMIN">ORG_ADMIN (Manage team & settings)</option>
                </Select>
              </Field>

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteFeedback(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={inviteLoading}>
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg">Create Workspace Organization</h3>
            <p className="mt-1 text-[12.5px] text-muted">
              Establish a new tenant domain for merchant operations.
            </p>

            <form onSubmit={handleCreateOrg} className="mt-4 flex flex-col gap-4">
              <Field label="Organization Name" htmlFor="newOrgName" required>
                <Input
                  id="newOrgName"
                  type="text"
                  placeholder="e.g. Apex Retail Global"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </Field>

              <Field label="Description" htmlFor="newOrgDesc">
                <Input
                  id="newOrgDesc"
                  type="text"
                  placeholder="e.g. Enterprise consumer electronics retailer"
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                />
              </Field>

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={createLoading}>
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
