/**
 * Neutralized DemoBadge: returns null so no demo banners or badges appear in the real product.
 */
export function DemoBadge({
  size: _size = "sm",
  className: _className,
}: {
  size?: "xs" | "sm";
  className?: string;
} = {}) {
  return null;
}
