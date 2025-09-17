import { ItemUtils, Tier } from './loot';

export interface MarketItem {
  id: number;
  name: string;
  tier: Tier;
  type: string;
  slot: string;
  imageUrl: string;
  price: number;
}

function createMarketItem(id: number, charisma: number): MarketItem {
  const tier = ItemUtils.getItemTier(id);
  const price = ItemUtils.getItemPrice(tier, charisma);
  const name = ItemUtils.getItemName(id);
  const type = ItemUtils.getItemType(id);
  const slot = ItemUtils.getItemSlot(id);
  const imageUrl = ItemUtils.getItemImage(id);

  return {
    id,
    name,
    tier,
    type,
    slot,
    imageUrl,
    price
  };
}

export function generateMarketItems(marketItemIds: number[], charisma: number): MarketItem[] {
  const items = marketItemIds.map(id => createMarketItem(id, charisma))
  return items;
}

export function potionPrice(level: number, charisma: number, negative: boolean = false): number {
  const price = level - (charisma * 2);
  if (negative) {
    return price;
  }
  return Math.max(1, price);
}