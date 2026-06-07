'use client';

import { useState } from 'react';
import ProductImage from '@/components/ui/ProductImage';
import LoadingState from '@/components/ui/LoadingState';
import type { Product } from '@/lib/types';
import { formatLKR } from '@/lib/utils';

interface ProductCardProps {
	product: Product;
	onView: (product: Product) => void;
	onAdd: (product: Product) => void;
	loading?: boolean;
}

export default function ProductCard({
	product,
	onView,
	onAdd,
	loading,
}: ProductCardProps) {
	const [addingAnim, setAddingAnim] = useState(false);

	const handleAdd = (p: Product) => {
		setAddingAnim(true);
		onAdd(p);
		setTimeout(() => setAddingAnim(false), 380);
	};

	if (loading) {
		return <LoadingState variant="card" />;
	}

	return (
		<div className="w-full flex gap-3 p-3.5 rounded-xl bg-elevated border border-border hover:border-primary/50 hover:shadow-md hover:shadow-black/20 transition-all duration-150 hover:-translate-y-0.5">
			<button
				type="button"
				onClick={() => onView(product)}
				className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-border"
				aria-label={`View ${product.name}`}
			>
				<ProductImage
					name={product.name}
					imageUrl={product.image_url}
					images={product.images}
					inStock={product.in_stock}
					className="absolute inset-0"
				/>
			</button>

			<div className="flex-1 min-w-0 flex flex-col justify-between">
				<button
					type="button"
					onClick={() => onView(product)}
					className="text-left"
				>
					<h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
						{product.name}
					</h3>
					<p className="text-primary font-bold text-sm mt-0.5">
						{product.price_lkr > 0
							? formatLKR(product.price_lkr)
							: 'Price unavailable'}
					</p>
					<p className="text-xs mt-0.5 flex items-center gap-1 flex-wrap">
						<span
							className={`w-1.5 h-1.5 rounded-full ${
								product.in_stock ? 'bg-success' : 'bg-danger'
							}`}
						/>
						<span className={product.in_stock ? 'text-muted' : 'text-danger'}>
							{product.in_stock ? 'In stock' : 'Out of stock'}
						</span>
						{product.is_perishable && (
							<span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-medium">
								Perishable
							</span>
						)}
					</p>
				</button>
				{product.url && product.url !== 'https://www.kapruka.com' && (
					<a
						href={product.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[10px] text-muted hover:text-accent transition-colors mt-0.5 truncate"
						onClick={(e) => e.stopPropagation()}
					>
						kapruka.com ↗
					</a>
				)}
			</div>

			<button
				type="button"
				onClick={() => handleAdd(product)}
				disabled={!product.in_stock}
				className={`shrink-0 self-center px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
					addingAnim ? 'animate-add-burst' : ''
				}`}
			>
				Add
			</button>
		</div>
	);
}
