export class Individual {
  constructor(width, height, geneticCode) {
    this.dirty = true;
    this.fitness = 0;
    this.width = width;
    this.height = height;
    this.geneticCode =
      geneticCode ??
      Array(width * height)
        .fill(0)
        .map(() => (random.double() < 0.5 ? 0 : 1));
  }

  getFitness() {
    if (!this.dirty) return this.fitness;

    this.fitness = 0;
    for (let i = 0; i < this.geneticCode.length; i++) {
      if (this.geneticCode[i] === 1) {
        this.fitness++;
      }
    }
    this.dirty = false;
    return this.fitness;
  }
}
