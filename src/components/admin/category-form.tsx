"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormAlert } from "@/components/admin/form-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import type { Category } from "@/lib/types";

type ImageUpload = {
  src: string;
  name: string;
};

export function CategoryForm({ category }: { category?: Category }) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  // Images est un tableau d'objets {src, name} venant des uploads
  const [image, setImage] = useState<
    | { src: string; name: string }
    | undefined
  >(undefined);
  const [featured, setFeatured] = useState<boolean>(
    category?.featured ?? false
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = Array.from(files).map((file) => {
      // Créer un chemin relatif vers public/uploads
      const name = file.name.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const src = `/uploads/${name}_${timestamp}`;
      return { src, name };
    });
    setImage(urls[0]);
  };

  return (
    <form className="mt-8 max-w-3xl space-y-6">
      <div>
        <label className="label">
          Nom *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Maison"
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
          placeholder="epicerie"
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
          defaultValue={category?.description ?? ""}
          className="textarea min-h-24"
        />
      </div>

      <div>
        <label className="label">
          Image *
        </label>
        <div className="mt-2">
          <label className="cursor-pointer border border-line rounded px-4 py-2 text-sm hover:bg-surface-2">
            <input
              type="file"
              name="categoryImage"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            Parcourir image
          </label>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-ink-3" /> Ajouter image
          </div>
        </div>
      </div>

      {image && (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-32 w-24 overflow-hidden border border-line bg-surface-2">
            <img
              src={image.src}
              alt={image.name || "Aperçu catégorie"}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-xs text-ink-3">
            Image sélectionnée
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-start gap-3 border border-line p-3 text-sm">
          <input
            type="checkbox"
            name="featured"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#b4552d]"
          />
          <span>
            <span className="block font-semibold">Mettre en avant</span>
            <span className="text-xs text-ink-3">
              La catégorie apparaît en priorité sur l&apos;accueil.
            </span>
          </span>
        </label>
        <SubmitButton>
          <Plus className="h-4 w-4" />
          {category ? "Enregistrer" : "Créer la catégorie"}
        </SubmitButton>
        <Link
          href="/admin/categories"
          className="btn btn-outline"
        >
          <ArrowLeft className="h-4 w-4" /> Annuler
        </Link>
      </div>
    </form>
  );
}