import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGroups, createGroup, joinGroup } from "@/lib/social.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Users, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Groups — Snapcal" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listGroups);
  const createFn = useServerFn(createGroup);
  const joinFn = useServerFn(joinGroup);
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: () => listFn() });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { name } }),
    onSuccess: () => { toast.success("Group created"); qc.invalidateQueries({ queryKey: ["groups"] }); setName(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const joinMut = useMutation({
    mutationFn: () => joinFn({ data: { code } }),
    onSuccess: () => { toast.success("Joined!"); qc.invalidateQueries({ queryKey: ["groups"] }); setCode(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="font-display text-2xl font-bold">Groups</h1>

      <div className="mt-5 space-y-2">
        {(groups ?? []).map((g) => (
          <Link key={g.id} to="/groups/$id" params={{ id: g.id }} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground">Code: <span className="font-mono">{g.invite_code}</span></div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        {!groups?.length && <p className="text-center text-sm text-muted-foreground">No groups yet.</p>}
      </div>

      <Card className="glass-card mt-6 rounded-2xl border-0 p-4">
        <div className="text-sm font-medium">Create a group</div>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button className="rounded-full bg-primary text-primary-foreground" disabled={!name || createMut.isPending} onClick={() => createMut.mutate()}><Plus className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="glass-card mt-3 rounded-2xl border-0 p-4">
        <div className="text-sm font-medium">Join with code</div>
        <div className="mt-2 flex gap-2">
          <Input placeholder="e.g. AB12CD" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono uppercase" />
          <Button variant="outline" className="rounded-full" disabled={!code || joinMut.isPending} onClick={() => joinMut.mutate()}>Join</Button>
        </div>
      </Card>
    </div>
  );
}
