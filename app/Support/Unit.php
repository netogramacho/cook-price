<?php

namespace App\Support;

class Unit
{
    /**
     * Mapa de unidades suportadas.
     * factor = quanto vale 1 unidade na unidade base da família (g, ml ou un).
     */
    public const MAP = [
        'g'  => ['family' => 'mass',   'factor' => 1.0,    'label' => 'g — Grama'],
        'kg' => ['family' => 'mass',   'factor' => 1000.0, 'label' => 'kg — Quilograma'],
        'ml' => ['family' => 'volume', 'factor' => 1.0,    'label' => 'ml — Mililitro'],
        'L'  => ['family' => 'volume', 'factor' => 1000.0, 'label' => 'L — Litro'],
        'un' => ['family' => 'count',  'factor' => 1.0,    'label' => 'un — Unidade'],
    ];

    public static function allowed(): array
    {
        return array_keys(self::MAP);
    }

    public static function factor(string $unit): float
    {
        return self::MAP[$unit]['factor'] ?? 1.0;
    }

    public static function family(string $unit): ?string
    {
        return self::MAP[$unit]['family'] ?? null;
    }

    public static function sameFamily(string $a, string $b): bool
    {
        $fa = self::family($a);
        return $fa !== null && $fa === self::family($b);
    }

    /**
     * Unidades pertencentes a uma família (ex.: 'mass' => ['g', 'kg']).
     */
    public static function inFamily(string $family): array
    {
        return array_keys(array_filter(
            self::MAP,
            fn ($meta) => $meta['family'] === $family
        ));
    }
}
