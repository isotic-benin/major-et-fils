"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgePercent, Search } from "lucide-react";
import { savePromotion } from "@/lib/admin-actions";
import { formatPrice, toDateInput } from "@/lib/utils";
import { FormAlert, FieldError } from "@/components/admin/form-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import type { ActionState, Category, Promotion } from "@/lib/types";

const initialState: ActionState = { ok: false };

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
}

export function PromotionForm({
  promotion,
  categories,
  products,
  defaultStartsAt,
  defaultEndsAt,
}: {
  promotion?: Promotion;
  categories: Category[];
  products: ProductOption[];
  defaultStartsAt: string;
  defaultEndsAt: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(savePromotion, initialState);
  const [scope, setScope] = useState(promotion?.scope ?? "all");
  const [type, setType] = useState(promotion?.type ?? "percent");
  const [selected, setSelected] = useState<string[]>(
    promotion?.productIds ?? [],
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/promotions");
      router.refresh();
    }
  }, [state, router]);

  const defaultStart = promotion
    ? toDateInput(promotion.startsAt)
    : defaultStartsAt;
  const defaultEnd = promotion ? toDateInput(promotion.endsAt) : defaultEndsAt;

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.categorySlug.toLowerCase().includes(term),
    );
  }, [products, search]);

  const errors = state.fieldErrors ?? {};

  const toggleProduct = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  return (
    <form action={formAction} className="mt-8">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}

      <div className="max-w-4xl space-y-6">
        <FormAlert error={state.error} fieldErrors={state.fieldErrors} />

        <section className="admin-card space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <h2 className="font-display text-2xl">L&apos;offre</h2>
          </div>

          <div>
            <label htmlFor="promotion-title" className="label">
              Titre de la promotion *
            </label>
            <input
              id="promotion-title"
              name="title"
              required
              className="input"
              defaultValue={promotion?.title ?? ""}
              aria-invalid={Boolean(errors.title)}
              placeholder="Le panier malin"
            />
            <FieldError messages={errors.title} />
          </div>

          <div>
            <label htmlFor="promotion-description" className="label">
              Description
            </label>
            <textarea
              id="promotion-description"
              name="description"
              className="textarea min-h-20"
              defaultValue={promotion?.description ?? ""}
              aria-invalid={Boolean(errors.description)}
              placeholder="Jusqu'à -15 % sur tout le rayon épicerie."
            />
            <FieldError messages={errors.description} />
          </div>

          <div>
            <label htmlFor="promotion-image" className="label">
              Image de la promotion *
            </label>
            <input
              id="promotion-image"
              name="promotionImage"
              type="file"
              accept="image/*"
              required={!promotion}
              className="input"
              aria-invalid={Boolean(errors.promotionImage)}
            />
            <FieldError messages={errors.promotionImage} />
            {promotion?.image && (
              <div className="mt-3 flex items-center gap-3 border border-line p-2">
                <Image
                  src={promotion.image}
                  alt="Image actuelle de la promotion"
                  width={96}
                  height={54}
                  className="h-14 w-24 object-cover"
                />
                <p className="text-xs text-ink-3">
                  Image actuelle. Laissez vide pour la conserver.
                </p>
              </div>
            )}
            <p className="field-hint text-xs text-ink-3">
              Image à afficher dans le carousel de la page d&apos;accueil (format recommandé : 1200×630)
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="label">Type de remise *</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "percent", label: "Pourcentage" },
                  { value: "fixed", label: "Montant fixe" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer border px-3 py-2.5 text-center text-xs font-semibold transition-colors ${
                      type === option.value
                        ? "border-ink bg-ink text-base"
                        : "border-line-strong text-ink-2 hover:border-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={() => setType(option.value as "percent" | "fixed")}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="promotion-value" className="label">
                Valeur *
              </label>
              <div className="relative">
                <input
                  id="promotion-value"
                  name="value"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="input pr-16 tabular-nums"
                  defaultValue={promotion?.value ?? ""}
                  aria-invalid={Boolean(errors.value)}
                  placeholder={type === "percent" ? "25" : "5000"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                  {type === "percent" ? "%" : "unités"}
                </span>
              </div>
              <p className="field-hint">
                {type === "percent"
                  ? "Entre 1 et 90 % du prix de base."
                  : `Montant déduit — ex. ${formatPrice(5000)}.`}
              </p>
              <FieldError messages={errors.value} />
            </div>
          </div>
        </section>

        <section className="admin-card space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-2xl">Cibles</h2>

          <fieldset>
            <legend className="label">Appliquer à *</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: "all", label: "Tous les produits" },
                { value: "category", label: "Une catégorie" },
                { value: "products", label: "Des produits précis" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer border px-3 py-3 text-center text-xs font-semibold transition-colors ${
                    scope === option.value
                      ? "border-ink bg-ink text-base"
                      : "border-line-strong text-ink-2 hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={() =>
                      setScope(option.value as "all" | "category" | "products")
                    }
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {scope === "category" && (
            <div>
              <label htmlFor="promotion-category" className="label">
                Catégorie concernée *
              </label>
              <select
                id="promotion-category"
                name="categorySlug"
                className="select"
                defaultValue={promotion?.categorySlug ?? ""}
                aria-invalid={Boolean(errors.categorySlug)}
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError messages={errors.categorySlug} />
            </div>
          )}

          {scope === "products" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="label mb-0">Produits concernés *</p>
                <p className="text-xs text-ink-3">
                  {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="relative mt-3">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                  strokeWidth={1.6}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="input h-10 min-h-10 pl-9 text-sm"
                  placeholder="Filtrer les produits…"
                  aria-label="Filtrer les produits"
                />
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto border border-line">
                {filteredProducts.length === 0 ? (
                  <p className="p-4 text-sm text-ink-3">Aucun produit trouvé.</p>
                ) : (
                  filteredProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-0 hover:bg-surface-2/50"
                    >
                      <input
                        type="checkbox"
                        name="productIds"
                        value={product.id}
                        checked={selected.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 accent-[#b4552d]"
                      />
                      <span className="flex-1">{product.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                        {product.categorySlug}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <FieldError messages={errors.productIds} />
            </div>
          )}
        </section>

        <section className="admin-card space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-2xl">Période & statut</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="promotion-start" className="label">
                Début *
              </label>
              <input
                id="promotion-start"
                name="startsAt"
                type="datetime-local"
                required
                className="input"
                defaultValue={defaultStart}
                aria-invalid={Boolean(errors.startsAt)}
              />
              <FieldError messages={errors.startsAt} />
            </div>
            <div>
              <label htmlFor="promotion-end" className="label">
                Fin *
              </label>
              <input
                id="promotion-end"
                name="endsAt"
                type="datetime-local"
                required
                className="input"
                defaultValue={defaultEnd}
                aria-invalid={Boolean(errors.endsAt)}
              />
              <FieldError messages={errors.endsAt} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 border border-line p-3 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={promotion ? promotion.active : true}
              className="mt-1 h-4 w-4 accent-[#b4552d]"
            />
            <span>
              <span className="block font-semibold">Promotion activée</span>
              <span className="text-xs text-ink-3">
                Elle s&apos;appliquera automatiquement pendant la période.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <SubmitButton>
            <BadgePercent className="h-4 w-4" />
            {promotion ? "Enregistrer" : "Créer la promotion"}
          </SubmitButton>
          <Link href="/admin/promotions" className="btn btn-outline">
            <ArrowLeft className="h-4 w-4" /> Annuler
          </Link>
        </div>
      </div>
    </form>
  );
}
