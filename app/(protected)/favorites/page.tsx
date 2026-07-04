import { Card } from "@/components/ui/card"

export default function FavoritesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold">Favorites</h1>
          <p className="text-muted-foreground">Your favorite content will appear here.</p>
        </div>
      </Card>
    </div>
  )
}
