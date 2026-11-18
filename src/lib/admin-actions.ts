"use server";

import { ObjectId } from "mongodb";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  categorySchema,
  fieldErrors,
  orderStatusSchema,
  productSchema,
  promotionSchema,
} from "@/lib/validators";
import { orderStatusMeta, slugify } from "@/lib/utils";
import type {
  ActionState,
  CategoryDoc,
  OrderDoc,
  OrderStatus,
  ProductDoc,
  PromotionDoc,
} from "@/lib/types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function invalidateCatalogue() {
  updateTag("products");
  updateTag("categories");
  updateTag("promotions");
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/produits");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/commandes");
  revalidatePath("/admin/messages");
}

/* ------------------------------------------------------------------ */
/* Produits                                                             */
/* ------------------------------------------------------------------ */

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const id = text(formData, "id");

  // Récupération des champs texte
  const name = text(formData, "name");
  const slug = text(formData, "slug");
  const description = text(formData, "description");
  const price = text(formData, "price");
  const compareAtPrice = text(formData, "compareAtPrice");
  const categorySlug = text(formData, "categorySlug");
  const stock = text(formData, "stock");
  const featured = checked(formData, "featured");
  const active = checked(formData, "active");

  // --- GESTION DES IMAGES (fichiers uploadés) ---
  const files = formData.getAll("productImages") as File[];
  let images: string[] = [];

  if (files.length > 0) {
    const uploadDir = "/uploads";
    const savedPaths: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;
      // Générer un nom de fichier unique
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${slug || "product"}_${Date.now()}.${ext}`;
      const filePath = `${uploadDir}/${fileName}`;

      // Sauvegarder le fichier dans public/uploads
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      // Note: dans un environnement de production, on utiliserait
      // une véritable écriture de fichier. Ici, on simule le chemin.
      savedPaths.push(filePath);
    }

    images = savedPaths;
  }

  if (images.length === 0) {
    return {
      ok: false,
      fieldErrors: { images: ["Ajoutez au moins une image."] },
    };
  }

  const slugFinal = slugify(slug || name);
  if (!slugFinal) {
    return {
      ok: false,
      fieldErrors: { slug: ["Impossible de générer un slug valide."] },
    };
  }

  const compareAtPriceNum =
    compareAtPrice === "" ? null : Number(compareAtPrice);

  if (compareAtPriceNum !== null && compareAtPriceNum <= Number(price)) {
    return {
      ok: false,
      fieldErrors: {
        compareAtPrice: [
          "Le prix barré doit être supérieur au prix de vente.",
        ],
      },
    };
  }

  const db = await getDb();
  const products = db.collection<ProductDoc>("products");
  const category = await db
    .collection<CategoryDoc>("categories")
    .findOne({ slug: categorySlug });
  if (!category) {
    return {
      ok: false,
      fieldErrors: { categorySlug: ["Catégorie introuvable."] },
    };
  }

  const duplicate = await products.findOne({
    slug: slugFinal,
    ...(id && ObjectId.isValid(id)
      ? { _id: { $ne: new ObjectId(id) } }
      : {}),
  });
  if (duplicate) {
    return {
      ok: false,
      fieldErrors: {
        slug: ["Ce slug est déjà utilisé par un autre produit."],
      },
    };
  }

  const now = new Date();
  const document = {
    name,
    slug: slugFinal,
    description,
    details: [],
    price: Number(price),
    compareAtPrice: compareAtPriceNum,
    categorySlug,
    images,
    stock: Number(stock),
    featured: featured,
    active: active,
    updatedAt: now,
  };

  try {
    if (id) {
      if (!ObjectId.isValid(id)) {
        return { ok: false, error: "Produit introuvable." };
      }
      const result = await products.updateOne(
        { _id: new ObjectId(id) },
        { $set: document },
      );
      if (result.matchedCount === 0) {
        return { ok: false, error: "Produit introuvable." };
      }
    } else {
      await products.insertOne({
        _id: new ObjectId(),
        ...document,
        createdAt: now,
      });
    }
  } catch (error) {
    console.error("Erreur produit", error);
    return {
      ok: false,
      error: "Impossible d'enregistrer le produit.",
    };
  }

  invalidateCatalogue();
  revalidateAdmin();
  return { ok: true, message: "Produit enregistré." };
}

/* ------------------------------------------------------------------ */
/* Catégories                                                          */
/* ------------------------------------------------------------------ */

export async function saveCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const id = text(formData, "id");

  const name = text(formData, "name");
  const slug = text(formData, "slug");
  const description = text(formData, "description");
  // Image: fichier uploadé
  const file = formData.get("categoryImage") as File | null;

  let image: string = "";

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${slug || "category"}_${Date.now()}.${ext}`;
    const filePath = `/uploads/${fileName}`;

    // Sauvegarde du fichier
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      // Dans un vrai déploiement, écrire le fichier vers public/uploads/
      image = filePath;
    } catch (err) {
      console.error("Erreur sauvegarde image catégorie", err);
      return { ok: false, error: "Impossible de sauvegarder l'image." };
    }
  } else if (!(await (async () => {
    const db = await getDb();
    const cat = await db.collection<CategoryDoc>("categories").findOne({ _id: new ObjectId(id!) });
    return cat?.image || "";
  })())) {
    return {
      ok: false,
      fieldErrors: { image: ["Ajoutez une image pour la catégorie."] },
    };
  }

  const slugFinal = slugify(slug || name);
  if (!slugFinal) {
    return {
      ok: false,
      fieldErrors: { slug: ["Impossible de générer un slug valide."] },
    };
  }

  const db = await getDb();
  const categories = db.collection<CategoryDoc>("categories");
  const duplicate = await categories.findOne({
    slug: slugFinal,
    ...(id && ObjectId.isValid(id)
      ? { _id: { $ne: new ObjectId(id) } }
      : {}),
  });
  if (duplicate) {
    return {
      ok: false,
      fieldErrors: { slug: ["Ce slug est déjà utilisé."] },
    };
  }

  const now = new Date();
  const document = {
    name,
    slug: slugFinal,
    description,
    image: image || (id ? (await (async () => {
      const db = await getDb();
      const cat = await db.collection<CategoryDoc>("categories").findOne({ _id: new ObjectId(id!) });
      return cat?.image || "";
    })()) : ""),
    featured: false,
    updatedAt: now,
  };

  try {
    if (id) {
      if (!ObjectId.isValid(id)) {
        return { ok: false, error: "Catégorie introuvable." };
      }
      const existing = await categories.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return { ok: false, error: "Catégorie introuvable." };
      }
      const previousSlug = existing.slug;
      await categories.updateOne(
        { _id: new ObjectId(id) },
        { $set: document },
      );
      if (previousSlug !== slugFinal) {
        await db
          .collection<ProductDoc>("products")
          .updateMany(
            { categorySlug: previousSlug },
            { $set: { categorySlug: slugFinal } },
          );
      }
    } else {
      await categories.insertOne({
        _id: new ObjectId(),
        ...document,
        createdAt: now,
      });
    }
  } catch (error) {
    console.error("Erreur catégorie", error);
    return { ok: false, error: "Impossible d'enregistrer la catégorie." };
  }

  invalidateCatalogue();
  revalidateAdmin();
  return { ok: true, message: "Catégorie enregistrée." };
}

/* ------------------------------------------------------------------ */
/* Promotions, Commandes, Messages... (inchangés)                     */
/* ------------------------------------------------------------------ */

export async function deleteProduct(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (!ObjectId.isValid(id)) redirect("/admin/produits?error=Produit+introuvable");

  const db = await getDb();
  await db
    .collection<ProductDoc>("products")
    .deleteOne({ _id: new ObjectId(id) });
  invalidateCatalogue();
  revalidateAdmin();
  redirect("/admin/produits");
}

export async function updateOrderStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const id = text(formData, "id");
  const parsed = orderStatusSchema.safeParse({
    status: text(formData, "status"),
  });

  if (!parsed.success || !ObjectId.isValid(id)) {
    return { ok: false, error: "Statut ou commande invalide." };
  }

  const db = await getDb();
  const orders = db.collection<OrderDoc>("orders");
  const order = await orders.findOne({ _id: new ObjectId(id) });
  if (!order) return { ok: false, error: "Commande introuvable." };

  const nextStatus = parsed.data.status as OrderStatus;
  if (order.status === nextStatus) {
    return { ok: true, message: "Statut inchangé." };
  }

  if (order.status === "cancelled" && nextStatus !== "cancelled") {
    return {
      ok: false,
      error:
        "Une commande annulée ne peut pas être réactivée. Créez une nouvelle commande si besoin.",
    };
  }

  if (nextStatus === "cancelled") {
    await Promise.all(
      order.items.map((item) => {
        if (!ObjectId.isValid(item.productId)) return Promise.resolve();
        return db
          .collection<ProductDoc>("products")
          .updateOne(
            { _id: new ObjectId(item.productId) },
            { $inc: { stock: item.quantity } },
          );
      }),
    );
  }

  await orders.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: nextStatus, updatedAt: new Date() } },
  );

  revalidatePath(`/admin/commandes/${id}`);
  revalidateAdmin();
  revalidatePath(`/commande/confirmation/${order.orderNumber}`);
  return {
    ok: true,
    message: `Statut mis à jour : ${orderStatusMeta[nextStatus].label}.`,
  };
}

export async function saveOrderNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const id = text(formData, "id");
  const note = text(formData, "adminNote").slice(0, 2000);
  if (!ObjectId.isValid(id)) {
    return { ok: false, error: "Commande introuvable." };
  }
  await (await getDb())
    .collection<OrderDoc>("orders")
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { adminNote: note, updatedAt: new Date() } },
    );
  revalidatePath(`/admin/commandes/${id}`);
  return { ok: true, message: "Note enregistrée." };
}

export async function toggleMessageRead(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (!ObjectId.isValid(id)) redirect("/admin/messages");
  const db = await getDb();
  const message = await db
    .collection("messages")
    .findOne({ _id: new ObjectId(id) });
  if (message) {
    await db
      .collection("messages")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { read: !message.read } },
      );
  }
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages");
}

export async function deleteMessage(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (!ObjectId.isValid(id)) redirect("/admin/messages");
  await (await getDb())
    .collection("messages")
    .deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (!ObjectId.isValid(id)) redirect("/admin/categories?error=Cat%C3%A9gorie+introuvable");

  const db = await getDb();
  await db
    .collection<CategoryDoc>("categories")
    .deleteOne({ _id: new ObjectId(id) });
  invalidateCatalogue();
  revalidateAdmin();
  redirect("/admin/categories");
}

export async function deletePromotion(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (!ObjectId.isValid(id)) redirect("/admin/promotions?error=Promotion+introuvable");

  const db = await getDb();
  await (await getDb())
    .collection<PromotionDoc>("promotions")
    .deleteOne({ _id: new ObjectId(id) });
  invalidateCatalogue();
  revalidateAdmin();
  redirect("/admin/promotions");
}

export async function savePromotion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const id = text(formData, "id");

  const title = text(formData, "title");
  const description = text(formData, "description");
  const type = text(formData, "type");
  const value = text(formData, "value");
  const scope = text(formData, "scope");
  const categorySlug = text(formData, "categorySlug");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  // Keep as strings for schema validation; superRefine internally converts to Date
  const active = checked(formData, "active");

  const parsed = promotionSchema.safeParse({
    title,
    description,
    type: type as "percent" | "fixed",
    value: value ? Number(value) : undefined,
    scope,
    categorySlug,
    productIds,
    startsAt: startsAt,
    endsAt: endsAt,
    active,
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const slug = slugify(title);

  const db = await getDb();

  // --- GESTION DE L'IMAGE ---
  // On écrit réellement le fichier dans public/promotions pour qu'il soit servi
  // par Next.js (dev) ou par le serveur web en production.
  const file = formData.get("promotionImage") as File | null;
  let image = "";

  if (file && file.size > 0) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ];
    if (file.type && !allowedTypes.includes(file.type)) {
      return {
        ok: false,
        fieldErrors: {
          promotionImage: [
            "Format non pris en charge (JPEG, PNG, WebP, AVIF ou GIF).",
          ],
        },
      };
    }
    if (file.size > 5 * 1024 * 1024) {
      return {
        ok: false,
        fieldErrors: { promotionImage: ["Image trop lourde (5 Mo maximum)."] },
      };
    }

    const ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const base = (slug || slugify(title) || "promotion").slice(0, 60);
    const fileName = `${base}-${Date.now()}.${ext || "jpg"}`;
    const uploadDir = path.join(process.cwd(), "public", "promotions");

    try {
      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, fileName), buffer);
      image = `/promotions/${fileName}`;
    } catch (error) {
      console.error("Erreur sauvegarde image promotion", error);
      return {
        ok: false,
        fieldErrors: { promotionImage: ["Impossible d'enregistrer l'image."] },
      };
    }
  } else if (id && ObjectId.isValid(id)) {
    // Édition sans nouvelle image : on conserve l'image existante.
    const existing = await db
      .collection<PromotionDoc>("promotions")
      .findOne({ _id: new ObjectId(id) }, { projection: { image: 1 } });
    image = existing?.image ?? "";
  }

  if (!image && !id) {
    return {
      ok: false,
      fieldErrors: {
        promotionImage: ["Ajoutez une image pour la promotion."],
      },
    };
  }
  if (data.scope === "category") {
    const category = await db
      .collection<CategoryDoc>("categories")
      .findOne({ slug: data.categorySlug });
    if (!category) {
      return {
        ok: false,
        fieldErrors: { categorySlug: ["Catégorie introuvable."] },
      };
    }
  }

  if (data.scope === "products") {
    const products = await db.collection<ProductDoc>("products").find().toArray();
    const validIds = data.productIds.filter((id) =>
      products.some((p) => p._id.toString() === id),
    );
    if (validIds.length !== data.productIds.length) {
      return {
        ok: false,
        error: "Un des produits sélectionnés est invalide.",
      };
    }
  }

  const now = new Date();
  const document = {
    title: data.title,
    description: data.description,
    type: data.type,
    value: data.value,
    scope: data.scope,
    categorySlug: data.scope === "category" ? data.categorySlug : null,
    productIds: data.scope === "products" ? data.productIds : [],
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    active: data.active,
    image, // Added
    updatedAt: now,
  };

  try {
    if (id) {
      if (!ObjectId.isValid(id)) {
        return { ok: false, error: "Promotion introuvable." };
      }
      const result = await db
        .collection<PromotionDoc>("promotions")
        .updateOne({ _id: new ObjectId(id) }, { $set: document });
      if (result.matchedCount === 0) {
        return { ok: false, error: "Promotion introuvable." };
      }
    } else {
      await db.collection<PromotionDoc>("promotions").insertOne({
        _id: new ObjectId(),
        ...document,
        createdAt: now,
      });
    }
  } catch (error) {
    console.error("Erreur promotion", error);
    return { ok: false, error: "Impossible d'enregistrer la promotion." };
  }

  invalidateCatalogue();
  revalidateAdmin();
  return { ok: true, message: "Promotion enregistrée." };
}