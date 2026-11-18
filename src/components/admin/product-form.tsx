"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormAlert } from "@/components/admin/form-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import type { Category, Product } from "@/lib/types";

type ImageUpload = {
  src: string;
  name: string;
};

export function ProductForm({
  product,
}: {
  product?: Product;
  categories?: Category[];
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Images est un tableau d'objets {src, name} venant des uploads
  const [images, setImages] = useState<Array<{src: string; name?: string}> | undefined>(undefined);
  const [stock, setStock] = useState(product?.stock ?? 10);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [compareAtPrice, setCompareAtPrice] =
    useState(product?.compareAtPrice ?? null);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = Array.from(files).map((file) => {
      // Créer un chemin relatif vers public/uploads
      const name = file.name.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const src = `/uploads/${name}_${timestamp}`;
      return { src, name };
    });
    setImages(urls);
  };

  return (
    <form className="mt-8 space-y-6">
      <div>
        <label className="label">
          Nom du produit *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Vase en terre cuite"
        />
      </div>

      <div>
        <label className="label">
          Slug (URL)
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="input"
          placeholder="vase-terre-cuite"
        />
        <p className="field-hint">
          Laissez vide pour générer automatiquement.
        </p>
      </div>

      <div>
        <label className="label">
          Description *
        </label>
        <textarea
          defaultValue={product?.description ?? ""}
          className="textarea min-h-32"
        />
      </div>

      <div>
        <label className="label">
          Images *
        </label>
        <div className="mt-2">
          <label className="cursor-pointer border border-line rounded px-4 py-2 text-sm hover:bg-surface-2">
            <input
              type="file"
              name="productImages"
              multiple
              className="hidden"
              onChange={handleImagesChange}
            />
            Parcourir des images
          </label>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-ink-3" /> Ajouter images
          </div>
        </div>
      </div>

      {images && images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] overflow-hidden border border-line bg-surface-2"
            >
              <img
                src={img.src}
                alt={img.name || "Image produit"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute top-2 right-2 bg-accent/20 text-[11px] font-semibold text-accent rounded px-2 py-1"
              >
                Image {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="label">
          Prix de vente *
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          min="0"
          step="1"
          className="input tabular-nums"
          placeholder="25000"
        />
      </div>

      <div>
        <label className="label">
          Prix barré (optionnel)
        </label>
        <input
          type="number"
          value={compareAtPrice ?? ""}
          onChange={(e) =>
            setCompareAtPrice(e.target.value === "" ? null : Number(e.target.value))
          }
          min="0"
          step="1"
          className="input tabular-nums"
          placeholder="32000"
        />
      </div>

      <div>
        <label className="label">
          Stock *
        </label>
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          min="0"
          step="1"
          className="input tabular-nums"
          placeholder="10"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          {product ? "Enregistrer" : "Créer le produit"}
        </button>
        <Link
          href="/admin/produits"
          className="btn btn-outline"
        >
          <ArrowLeft className="h-4 w-4" /> Annuler
        </Link>
      </div>
    </form>
  );
}