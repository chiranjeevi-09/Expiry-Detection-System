import { useState } from 'react';
import { History as HistoryIcon, Plus, Bell, Trash2, XCircle, Filter, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { HistoryEntry } from '@/types/product';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type ActionFilter = 'all' | 'added' | 'notified' | 'removed' | 'expired';

export default function History() {
  const { history, historyLoading } = useProducts();
  const [filter, setFilter] = useState<ActionFilter>('all');

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(entry => entry.action === filter);

  const actionConfig = {
    added: {
      icon: Plus,
      color: 'text-success',
      bgColor: 'bg-success/10',
      badge: 'bg-success/10 text-success border-success/20',
    },
    notified: {
      icon: Bell,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      badge: 'bg-warning/10 text-warning border-warning/20',
    },
    removed: {
      icon: Trash2,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      badge: 'bg-muted text-muted-foreground border-muted',
    },
    expired: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      badge: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const filterOptions: { value: ActionFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'added', label: 'Added' },
    { value: 'notified', label: 'Notified' },
    { value: 'removed', label: 'Removed' },
    { value: 'expired', label: 'Expired' },
  ];

  if (historyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-16 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="gradient-primary p-3 rounded-xl">
          <HistoryIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">History</h1>
          <p className="text-muted-foreground">Track all inventory actions</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 shadow-card">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() => setFilter(option.value)}
              className={cn(
                "transition-all",
                filter === option.value && "bg-primary text-primary-foreground border-primary"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No history entries</h3>
          <p className="text-muted-foreground">
            {filter === 'all' ? 'Start adding products to see history' : `No "${filter}" actions recorded yet`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((entry) => {
            const config = actionConfig[entry.action];
            const Icon = config.icon;

            return (
              <Card key={entry.id} className="p-4 shadow-card hover:shadow-glow transition-all">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {entry.productName}
                      </h3>
                      <Badge className={cn("text-xs capitalize", config.badge)}>
                        {entry.action}
                      </Badge>
                    </div>
                    
                    {entry.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.details}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="font-mono">{entry.barcode}</span>
                      <span>{format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}