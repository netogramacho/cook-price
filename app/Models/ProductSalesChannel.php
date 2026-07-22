<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductSalesChannel extends Pivot
{
    use HasUuids;

    public $incrementing = false;

    protected $table = 'product_sales_channels';

    protected $fillable = [
        'product_id',
        'sales_channel_id',
        'custom_price',
    ];

    protected function casts(): array
    {
        return [
            'custom_price' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function salesChannel(): BelongsTo
    {
        return $this->belongsTo(SalesChannel::class);
    }
}
