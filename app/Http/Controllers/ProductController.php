<?php

namespace App\Http\Controllers;

use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateChannelPricesRequest;
use App\Http\Requests\Product\UpdatePriceRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\User;
use App\Services\ProductCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private ProductCostService $cost_service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');

        $products = Product::where('user_id', $request->user()->id)
            ->where('active', true)
            ->with(['recipes', 'insumos', 'salesChannels'])
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->orderBy('name')
            ->paginate($per_page);

        // Canais carregados uma vez para toda a página (evita uma query por produto)
        $channels = ProductCostService::channelsOf($request->user()->id);

        $products->getCollection()->transform(function ($product) use ($channels) {
            $cost = $this->cost_service->calculate($product, $channels);

            return array_merge($product->toArray(), [
                'base_cost'                  => $cost['base_cost'],
                'production_cost'            => $cost['production_cost'],
                'cost_per_yield'             => $cost['cost_per_yield'],
                'suggested_price_per_yield'  => $cost['suggested_price_per_yield'],
                'custom_price'               => $cost['custom_price'],
                'calculated_price_per_yield' => $cost['calculated_price_per_yield'],
                // Substitui a relação crua pelas linhas já calculadas (preço, líquido, margem)
                'sales_channels'             => $cost['sales_channels'],
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => $products,
            'message' => 'Produtos listados com sucesso.',
        ]);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        if ($limit = $this->checkProductLimit($user)) return $limit;

        $product = Product::create([
            'user_id'            => $user->id,
            'name'               => $request->name,
            'description'        => $request->description,
            'yield'              => $request->yield,
            'yield_unit'         => $request->yield_unit,
            'invisible_cost_pct' => $request->invisible_cost_pct,
            'profit_multiplier'  => $request->profit_multiplier,
        ]);

        $product->recipes()->sync($this->buildRecipeSync($request->recipes));
        $product->insumos()->sync($this->buildItemsSync($request->ingredients ?? [], $request->insumos ?? []));

        return $this->respondWithProduct($product, 'Produto criado com sucesso.', 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        if ($denied = $this->authorizeProduct($request, $product)) return $denied;

        return $this->respondWithProduct($product, 'Produto encontrado.');
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        if ($denied = $this->authorizeProduct($request, $product)) return $denied;

        $product->update($request->only(
            'name', 'description', 'yield', 'yield_unit', 'invisible_cost_pct', 'profit_multiplier'
        ));

        if ($request->has('recipes')) {
            $product->recipes()->sync($this->buildRecipeSync($request->recipes));
        }
        if ($request->has('insumos') || $request->has('ingredients')) {
            $product->insumos()->sync($this->buildItemsSync($request->ingredients ?? [], $request->insumos ?? []));
        }

        return $this->respondWithProduct($product, 'Produto atualizado com sucesso.');
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        if ($denied = $this->authorizeProduct($request, $product)) return $denied;

        $product->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Produto excluído com sucesso.',
        ]);
    }

    /**
     * Atalho: transforma uma receita em um produto vendável, pré-preenchido com
     * a receita (1 porção) e suas eventuais linhas de insumo já como insumos do produto.
     */
    public function fromRecipe(Request $request, Recipe $recipe): JsonResponse
    {
        if ($recipe->user_id !== $request->user()->id || !$recipe->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

        $user = $request->user()->load('plan');

        // Evita duplicar: se já existe um produto gerado a partir desta receita, abre o existente.
        $existing = Product::where('user_id', $user->id)
            ->where('origin_recipe_id', $recipe->id)
            ->where('active', true)
            ->first();
        if ($existing) {
            return $this->respondWithProduct($existing, 'Você já tem um produto criado a partir desta receita.');
        }

        if ($limit = $this->checkProductLimit($user)) return $limit;

        $name = $this->uniqueProductName($user->id, $recipe->name);

        $product = Product::create([
            'user_id'            => $user->id,
            'origin_recipe_id'   => $recipe->id,
            'name'               => $name,
            'description'        => $recipe->description,
            'yield'              => $recipe->yield,
            'yield_unit'         => $recipe->yield_unit,
            'invisible_cost_pct' => 0,
            'profit_multiplier'  => $recipe->profit_multiplier,
        ]);

        $product->recipes()->sync([$recipe->id => ['quantity' => 1]]);

        // Aproveita linhas de insumo/embalagem da receita como insumos do produto
        $recipe->load('ingredients');
        $insumoSync = [];
        foreach ($recipe->ingredients as $ingredient) {
            if (in_array($ingredient->type->value, ['insumo', 'packaging'], true)) {
                $insumoSync[$ingredient->id] = [
                    'quantity' => $ingredient->pivot->quantity,
                    'unit'     => $ingredient->pivot->unit,
                ];
            }
        }
        if ($insumoSync) {
            $product->insumos()->sync($insumoSync);
        }

        return $this->respondWithProduct($product, 'Produto criado a partir da receita.', 201);
    }

    /**
     * Preço de venda por unidade de rendimento definido à mão.
     * Enviar custom_price null devolve o produto ao preço calculado pelo multiplicador.
     */
    public function updatePrice(UpdatePriceRequest $request, Product $product): JsonResponse
    {
        if ($denied = $this->authorizeProduct($request, $product)) return $denied;

        $product->update(['custom_price' => $request->custom_price]);

        return $this->respondWithProduct($product, $request->custom_price === null
            ? 'Preço voltou a ser calculado pelo multiplicador.'
            : 'Preço sugerido atualizado com sucesso.');
    }

    /**
     * Preço manual do produto em cada app. Enviar custom_price null (ou omitir o canal)
     * devolve a linha ao preço calculado pela taxa.
     */
    public function updateChannelPrices(UpdateChannelPricesRequest $request, Product $product): JsonResponse
    {
        if ($denied = $this->authorizeProduct($request, $product)) return $denied;

        $sync = [];
        foreach ($request->sales_channels as $item) {
            if (($item['custom_price'] ?? null) === null) continue;

            $sync[$item['sales_channel_id']] = ['custom_price' => $item['custom_price']];
        }

        $product->salesChannels()->sync($sync);

        return $this->respondWithProduct($product, 'Preços por aplicativo atualizados com sucesso.');
    }

    private function respondWithProduct(Product $product, string $message, int $status = 200): JsonResponse
    {
        $product->load(['recipes', 'insumos', 'salesChannels']);
        $cost = $this->cost_service->calculate($product);

        return response()->json([
            'success' => true,
            'data'    => $this->formatProduct($product, $cost),
            'message' => $message,
        ], $status);
    }

    private function authorizeProduct(Request $request, Product $product): ?JsonResponse
    {
        if ($product->user_id !== $request->user()->id || !$product->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Produto não encontrado.',
                'error_code' => 'PRODUCT_NOT_FOUND',
            ], 404);
        }
        return null;
    }

    private function checkProductLimit(User $user): ?JsonResponse
    {
        $plan = $user->plan;
        if ($plan->max_products === null) return null;

        $count = Product::where('user_id', $user->id)->where('active', true)->count();
        if ($count < $plan->max_products) return null;

        return response()->json([
            'success'    => false,
            'message'    => "Seu plano permite no máximo {$plan->max_products} produtos. Faça upgrade para continuar.",
            'error_code' => 'PLAN_LIMIT_REACHED',
        ], 403);
    }

    private function uniqueProductName(string $user_id, string $base): string
    {
        $name = $base;
        $i    = 2;
        while (Product::where('user_id', $user_id)->where('name', $name)->exists()) {
            $name = $base . ' (' . $i . ')';
            $i++;
        }
        return $name;
    }

    private function buildRecipeSync(array $recipes): array
    {
        $sync = [];
        foreach ($recipes as $item) {
            $sync[$item['recipe_id']] = ['quantity' => $item['quantity']];
        }
        return $sync;
    }

    /**
     * Itens de montagem do produto (pivot product_insumos): ingredientes avulsos
     * e insumos compartilham o mesmo pivot, diferenciados pelo type do ingrediente.
     */
    private function buildItemsSync(array $ingredients, array $insumos): array
    {
        $sync = [];
        foreach ([...$ingredients, ...$insumos] as $item) {
            $sync[$item['ingredient_id']] = [
                'quantity' => $item['quantity'],
                'unit'     => $item['unit'] ?? null,
            ];
        }
        return $sync;
    }

    private function formatProduct(Product $product, array $cost): array
    {
        return [
            'id'                         => $product->id,
            'name'                       => $product->name,
            'description'                => $product->description,
            'yield'                      => $product->yield,
            'yield_unit'                 => $product->yield_unit,
            'invisible_cost_pct'         => $product->invisible_cost_pct,
            'profit_multiplier'          => $product->profit_multiplier,
            'active'                     => $product->active,
            'created_at'                 => $product->created_at,
            'updated_at'                 => $product->updated_at,
            'recipes'                    => $cost['recipes'],
            'ingredients'                => $cost['ingredients'],
            'insumos'                    => $cost['insumos'],
            'sales_channels'             => $cost['sales_channels'],
            'recipes_cost'               => $cost['recipes_cost'],
            'ingredients_cost'           => $cost['ingredients_cost'],
            'insumos_cost'               => $cost['insumos_cost'],
            'base_cost'                  => $cost['base_cost'],
            'invisible_cost'             => $cost['invisible_cost'],
            'production_cost'            => $cost['production_cost'],
            'profit_margin_pct'          => $cost['profit_margin_pct'],
            'suggested_price'            => $cost['suggested_price'],
            'cost_per_yield'             => $cost['cost_per_yield'],
            'suggested_price_per_yield'  => $cost['suggested_price_per_yield'],
            'custom_price'               => $cost['custom_price'],
            'calculated_price_per_yield' => $cost['calculated_price_per_yield'],
        ];
    }
}
