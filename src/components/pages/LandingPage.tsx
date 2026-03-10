import { ArrowRight, CheckCircle2, FileText, LayoutGrid, Sparkles } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";

const featureCards = [
  {
    icon: FileText,
    title: "Meeting Notes That Stay Useful",
    description:
      "Capture clean notes, decisions, and follow-ups in one place so every meeting turns into visible momentum.",
  },
  {
    icon: LayoutGrid,
    title: "Tasks You Can Read At A Glance",
    description:
      "Track active work without clutter. See status fast, update quickly, and keep your team aligned with fewer clicks.",
  },
  {
    icon: CheckCircle2,
    title: "Project Clarity Across The Team",
    description:
      "Keep everyone on the same page with shared context for docs, people, tasks, and priorities across every project.",
  },
] as const;

export const LandingPage = () => {
  return (
    <div className="app-atmosphere min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-6 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-16">
        <section className="hero-gradient relative overflow-hidden rounded-2xl border border-primary/25 px-5 py-8 shadow-xl shadow-primary/15 sm:rounded-3xl sm:px-10 sm:py-14">
          <div className="absolute -right-20 -top-20 size-52 rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-20 size-64 rounded-full bg-primary/35 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <Badge className="bg-background/75 text-foreground" variant="outline">
              <Sparkles className="size-3" />
              Built for focused teams
            </Badge>

            <div className="space-y-4">
              <p className="eyebrow-label text-foreground/80">Meridian workspace</p>
              <h1 className="display-title text-balance text-foreground">
                Notes, tasks, and project momentum in one beautiful workspace.
              </h1>
              <p className="max-w-2xl text-sm text-foreground/80 sm:text-base">
                Meridian helps small teams move from meeting conversations to visible execution. Keep the signal high,
                keep context close, and ship with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
                <Link to="/overview">
                  Enter the workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-foreground/25 bg-background/70 sm:w-auto">
                <Link to="/organizations">Explore organizations</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 md:gap-5">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-primary/15 bg-card/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </section>

        <section className="surface-feature rounded-2xl border border-border/70 px-5 py-6 sm:px-6">
          <CardContent className="px-0">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="eyebrow-label">Start quickly</p>
                <h2 className="mt-1 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
                  Create your first project and make the next meeting count.
                </h2>
              </div>
              <Button asChild size="lg">
                <Link to="/overview">Get started</Link>
              </Button>
            </div>
          </CardContent>
        </section>
      </main>
    </div>
  );
};
