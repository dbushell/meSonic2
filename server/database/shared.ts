const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

export function naturalSort<Type extends {name: string}>(item: Type[]) {
  return item.sort((a, b) => naturalCollator.compare(a.name, b.name));
}
