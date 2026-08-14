import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/features/admin/hooks/use-admin-dashboard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';

const numberFormatter = new Intl.NumberFormat('en');
const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { dashboard, isLoading, error, retry } = useAdminDashboard();

  const publicationRate = dashboard?.metrics.totalRecipes
    ? Math.round((dashboard.metrics.publishedRecipes / dashboard.metrics.totalRecipes) * 100)
    : 0;

  const metricCards = dashboard
    ? [
        {
          label: 'Community',
          value: dashboard.metrics.totalUsers,
          detail: 'Registered members',
          icon: Users,
        },
        {
          label: 'Recipes',
          value: dashboard.metrics.totalRecipes,
          detail: `${numberFormatter.format(dashboard.metrics.draftRecipes)} currently in draft`,
          icon: BookOpen,
        },
        {
          label: 'Published',
          value: dashboard.metrics.publishedRecipes,
          detail: `${publicationRate}% of all recipes`,
          icon: CircleCheck,
        },
        {
          label: 'Reviews',
          value: dashboard.metrics.totalReviews,
          detail: 'Community feedback',
          icon: MessageSquare,
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge variant="outline">
            <ShieldCheck data-icon="inline-start" />
            Admin workspace
          </Badge>
          <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Welcome back, {user?.name.split(' ')[0]}. Here is what is happening across Claypot.
          </p>
        </div>
        <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-fit')} to="/recipes">
          View live recipes
          <ArrowUpRight />
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error || !dashboard ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold">Dashboard data could not be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error ?? 'Try the request again.'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={retry}>
              <RefreshCw />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Platform totals"
          >
            {metricCards.map((metric) => (
              <Card key={metric.label}>
                <CardContent>
                  <div className="mb-5 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <metric.icon className="size-5" />
                  </div>
                  <p className="text-3xl font-semibold tracking-[-0.04em]">
                    {numberFormatter.format(metric.value)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{metric.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Recent recipes</CardTitle>
                <CardDescription>
                  The latest recipe submissions across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {dashboard.recentRecipes.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <BookOpen className="mx-auto size-7 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">No recipes yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      New recipe submissions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-160 text-left text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="px-6 py-3 font-medium">Recipe</th>
                          <th className="px-4 py-3 font-medium">Author</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 text-right font-medium">Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.recentRecipes.map((recipe) => (
                          <tr key={recipe.id} className="border-b last:border-0">
                            <td className="px-6 py-4">
                              {recipe.status === 'published' ? (
                                <Link
                                  className="font-semibold hover:text-primary hover:underline"
                                  to={`/recipes/${recipe.slug}`}
                                >
                                  {recipe.title}
                                </Link>
                              ) : (
                                <span className="font-semibold">{recipe.title}</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <Link
                                className="text-muted-foreground hover:text-foreground"
                                to={`/cooks/${recipe.author.username}`}
                              >
                                {recipe.author.name}
                              </Link>
                            </td>
                            <td className="px-4 py-4">
                              <Badge
                                variant={recipe.status === 'published' ? 'secondary' : 'outline'}
                              >
                                {recipe.status === 'published' ? 'Published' : 'Draft'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap text-muted-foreground">
                              {dateFormatter.format(new Date(recipe.createdAt))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>New members</CardTitle>
                <CardDescription>Recently created Claypot accounts.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y px-0">
                {dashboard.recentUsers.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Users className="mx-auto size-7 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">No members yet</p>
                  </div>
                ) : (
                  dashboard.recentUsers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-6 py-4">
                      {member.avatarUrl ? (
                        <img
                          className="size-10 shrink-0 rounded-full object-cover"
                          src={member.avatarUrl}
                          alt=""
                        />
                      ) : (
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            className="truncate text-sm font-semibold hover:text-primary"
                            to={`/cooks/${member.username}`}
                          >
                            {member.name}
                          </Link>
                          {member.role === 'admin' && <Badge variant="outline">Admin</Badge>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(member.createdAt))}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
