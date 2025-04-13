export function cmToPx(cm:number, dpi = 96) {
    // 1 pouce = 2.54 cm
    return cm * (dpi / 2.54);
  }