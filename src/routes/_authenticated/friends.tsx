import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFriends, sendFriendRequest, respondFriendRequest } from "@/lib/social.functions";
import { searchUsers } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Check, X, ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Friends — Snapcal" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listFriends);
  const searchFn = useServerFn(searchUsers);
  const reqFn = useServerFn(sendFriendRequest);
  const respFn = useServerFn(respondFriendRequest);
  const { data } = useQuery({ queryKey: ["friends"], queryFn: () => listFn() });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchUsers>>>([]);

  const sendMut = useMutation({
    mutationFn: (id: string) => reqFn({ data: { user_id: id } }),
    onSuccess: () => { toast.success("Request sent"); qc.invalidateQueries({ queryKey: ["friends"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const respMut = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => respFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });

  async function doSearch() {
    if (q.length < 2) return;
    const r = await searchFn({ data: { query: q } });
    setResults(r);
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="font-display text-2xl font-bold">Social</h1>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to="/friends" className="glass-card flex items-center gap-2 rounded-2xl border-0 p-3 text-sm font-medium"><UserPlus className="h-4 w-4 text-primary" />Friends</Link>
        <Link to="/groups" className="glass-card flex items-center gap-2 rounded-2xl border-0 p-3 text-sm font-medium"><Users className="h-4 w-4 text-primary" />Groups</Link>
      </div>

      <Tabs defaultValue="friends" className="mt-5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="requests">Requests{data?.incoming.length ? ` (${data.incoming.length})` : ""}</TabsTrigger>
          <TabsTrigger value="find">Find</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4 space-y-2">
          {(data?.friends ?? []).length === 0 && <p className="text-center text-sm text-muted-foreground">No friends yet. Find some!</p>}
          {(data?.friends ?? []).map((f) => f && (
            <Link key={f.user_id} to="/friends/$id" params={{ id: f.user_id }} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-3">
              <Avatar name={f.display_name ?? f.username ?? "?"} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.display_name ?? f.username}</div>
                <div className="truncate text-xs text-muted-foreground">@{f.username}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-2">
          {(data?.incoming ?? []).map((r) => r.profile && (
            <Card key={r.id} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-3">
              <Avatar name={r.profile.display_name ?? r.profile.username ?? "?"} />
              <div className="min-w-0 flex-1 truncate font-medium">{r.profile.display_name ?? r.profile.username}</div>
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground" onClick={() => respMut.mutate({ id: r.id, accept: true })}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => respMut.mutate({ id: r.id, accept: false })}><X className="h-4 w-4" /></Button>
            </Card>
          ))}
          {(data?.outgoing ?? []).map((r) => r.profile && (
            <Card key={r.id} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-3 opacity-70">
              <Avatar name={r.profile.display_name ?? r.profile.username ?? "?"} />
              <div className="min-w-0 flex-1 truncate text-sm">@{r.profile.username} <span className="text-xs text-muted-foreground">· pending</span></div>
            </Card>
          ))}
          {!data?.incoming.length && !data?.outgoing.length && <p className="text-center text-sm text-muted-foreground">No requests.</p>}
        </TabsContent>

        <TabsContent value="find" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search by username or email" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <Button onClick={doSearch} className="rounded-full bg-primary text-primary-foreground"><Search className="h-4 w-4" /></Button>
          </div>
          {results.map((u) => (
            <Card key={u.user_id} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-3">
              <Avatar name={u.display_name ?? u.username ?? "?"} />
              <div className="min-w-0 flex-1 truncate"><div className="font-medium">{u.display_name ?? u.username}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
              <Button size="sm" className="rounded-full bg-primary text-primary-foreground" onClick={() => sendMut.mutate(u.user_id)}>Add</Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">{name.charAt(0).toUpperCase()}</div>;
}
