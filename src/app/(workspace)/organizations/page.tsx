"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
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
  KeyRound,
  Settings as SettingsIcon,
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
        <RefreshCw className="h-6 w-6 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Administration Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
          <Building2 className="h-3.5 w-3.5 text-sky-400" />
          Organizations & Roles
        </span>
        <Link
          href="/admin/security"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Security & Cryptographic Audit
        </Link>
        <Link
          href="/settings"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          Platform Settings
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Multi-Tenant Organizations & Roles
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Tenant Scoped
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Manage merchant enterprise domains, team roles, and case tenancy boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganizations}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            <span>New Organization</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Organization Cards / Grid */}
      {orgs.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sky-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-fg">No Merchant Workspaces Found</h3>
          <p className="max-w-md text-xs text-subtle">
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
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => {
              const isSelected = selectedOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-sky-500/50 bg-[#111726] shadow-sm"
                      : "border-white/[0.08] bg-[#0E121D] hover:border-white/[0.16] hover:bg-[#111726]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-fg text-sm">{org.name}</span>
                    {org.userRole && (
                      <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono uppercase text-subtle">
                        {org.userRole}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-subtle line-clamp-2">
                    {org.description || "No description provided."}
                  </p>
                  <div className="mt-3.5 flex items-center gap-4 text-[11px] text-faint">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{org.memberCount} members</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" />
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
              <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-fg">{activeOrg.name}</h2>
                      <code className="rounded border border-white/[0.08] bg-[#0A0D14] px-2 py-0.5 text-[11px] text-faint font-mono">
                        slug: {activeOrg.slug}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      {activeOrg.description || "Enterprise workspace domain"}
                    </p>
                  </div>

                  {activeOrg.canManage && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setInviteModalOpen(true)}
                      className="text-xs"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      <span>Invite Team Member</span>
                    </Button>
                  )}
                </div>

                <div className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-fg flex items-center gap-2 uppercase tracking-wider">
                      <Users className="h-4 w-4 text-sky-400" />
                      <span>Organization Members ({activeOrg.members.length})</span>
                    </h3>
                    <span className="text-[11px] text-faint">
                      Tenant Access Scoped to {activeOrg.name}
                    </span>
                  </div>

                  {/* Members Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.06] bg-[#0A0D14] text-[11.5px] font-medium text-subtle">
                        <tr>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Global Role</th>
                          <th className="px-4 py-3">Organization Role</th>
                          <th className="px-4 py-3">Joined Date</th>
                          {activeOrg.canManage && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {activeOrg.members.map((member) => {
                          const isCurrentUser = session?.user?.email === member.email;
                          return (
                            <tr key={member.membershipId} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] font-semibold text-xs text-fg">
                                    {member.name.charAt(0)}
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-fg flex items-center gap-1.5">
                                      {member.name}
                                      {isCurrentUser && (
                                        <span className="text-[10px] text-faint font-mono">(You)</span>
                                      )}
                                    </span>
                                    <span className="text-[11px] text-faint">{member.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-subtle">
                                <span className="font-mono text-[11px]">{member.globalRole}</span>
                              </td>

                              <td className="px-4 py-3">
                                {activeOrg.canManage && !isCurrentUser ? (
                                  <Select
                                    value={member.orgRole}
                                    onChange={(e) => handleUpdateRole(member.membershipId, e.target.value)}
                                    className="h-7 py-0 text-xs bg-[#0A0D14] border-white/[0.08]"
                                  >
                                    <option value="VIEWER">VIEWER</option>
                                    <option value="MERCHANT_AGENT">MERCHANT_AGENT</option>
                                    <option value="RESOLUTION_MANAGER">RESOLUTION_MANAGER</option>
                                    <option value="ORG_ADMIN">ORG_ADMIN</option>
                                    <option value="OWNER">OWNER</option>
                                  </Select>
                                ) : (
                                  <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-fg">
                                    {member.orgRole}
                                  </span>
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
                                      className="rounded p-1 text-faint hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
                      <h4 className="text-xs font-semibold text-subtle mb-2 uppercase tracking-wider">
                        Pending Invitations ({activeOrg.pendingInvitations.length})
                      </h4>
                      <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y divide-white/[0.04]">
                        {activeOrg.pendingInvitations.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-3 text-xs"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-fg">{inv.email}</span>
                              <span className="text-[11px] text-faint">
                                Role: {inv.role} • Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                              Pending Acceptance
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0E121D] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-fg">Invite Team Member</h3>
            <p className="mt-1 text-xs text-subtle">
              Add a new merchant representative or dispute manager to this workspace.
            </p>

            <form onSubmit={handleSendInvite} className="mt-4 flex flex-col gap-4">
              {inviteFeedback?.error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{inviteFeedback.error}</span>
                </div>
              )}
              {inviteFeedback?.success && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
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
                  className="bg-[#0A0D14] border-white/[0.08]"
                />
              </Field>

              <Field label="Assigned Role" htmlFor="inviteRole" required>
                <Select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-[#0A0D14] border-white/[0.08]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0E121D] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-fg">Create Workspace Organization</h3>
            <p className="mt-1 text-xs text-subtle">
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
                  className="bg-[#0A0D14] border-white/[0.08]"
                />
              </Field>

              <Field label="Description" htmlFor="newOrgDesc">
                <Input
                  id="newOrgDesc"
                  type="text"
                  placeholder="e.g. Enterprise consumer electronics retailer"
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                  className="bg-[#0A0D14] border-white/[0.08]"
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
