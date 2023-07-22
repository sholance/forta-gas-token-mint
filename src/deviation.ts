// typescript version of rolling average and standard deviation calculator from rolling-math
import BigNumber from 'bignumber.js';
import assert from 'assert';

// in memory rolling average calculator
export default class SdMath {
  private windowSize: number;
  private elements: BigNumber[];
  private nextIdx: number;
  private sum: BigNumber;
  private mean: BigNumber;
  private variance: BigNumber;

  constructor(windowSize: number) {
    if (!windowSize) {
      throw new Error('You must provide a valid window size');
    }
    this.windowSize = windowSize;
    this.elements = new Array(windowSize);
    this.nextIdx = 0;
    this.sum = new BigNumber(NaN);
    this.mean = new BigNumber(NaN);
    this.variance = new BigNumber(NaN);
  }

  // returns number of elements
  getNumElements(): number {
    return this.elements[this.windowSize - 1] === undefined ? this.nextIdx : this.windowSize;
  }

  // returns windowSize;
  getWindowSize(): number {
    return this.windowSize;
  }

  // returns the sum of the past windowSize elements
  getSum(): BigNumber {
    return this.sum;
  }

  // returns rolling average of the past windowSize elements
  getAverage(): BigNumber {
    return this.mean;
  }

  // returns rolling standard deviation of the past windowSize elements
  getStandardDeviation(): BigNumber {
    return this.variance.sqrt();
  }

  // adds an element into the rolling average
  addElement(element: BigNumber): void {
    assert(BigNumber.isBigNumber(element), 'Elements must be BigNumbers');
    assert(element.isFinite(), 'Elements cannot be non-finite');

    if (this.elements[this.windowSize - 1] === undefined) {
      this.addElementNonFullList(element);
    } else {
      this.addElementFullList(element);
    }
  }

  // adds an element to the rolling average when the average is full
  private addElementFullList(element: BigNumber): void {
    // update the sum
    this.sum = this.sum.minus(this.currElement());
    this.sum = this.sum.plus(element);

    // update the mean
    const oldMean = this.mean;
    const diff = element.minus(this.currElement());
    this.mean = oldMean.plus(diff.div(this.windowSize));

    // update the std
    const newDeviation = element.minus(this.mean);
    const oldDeviation = this.currElement().minus(oldMean);
    const sampleSize = this.windowSize - 1;
    const summedDeviation = newDeviation.plus(oldDeviation);

    this.variance = this.variance.plus((diff.times(summedDeviation).div(sampleSize)));

    // Rounding can cause the variance to dip slightly below zero, make sure this never happens
    if (this.variance.isLessThan(0)) {
      this.variance = new BigNumber(0);
    }

    // replace the oldest element with this one
    this.elements[this.nextIdx] = element;
    this.incIdx();
  }

  // adds an element to the rolling average when the average isn't full
  private addElementNonFullList(element: BigNumber): void {
    // if it is the first element, initialize our variables
    if (this.elements[0] === undefined) {
      this.sum = element;
      this.mean = element;
      this.variance = new BigNumber(0);
    } else {
      // Welford's algorithm
      const numElements = this.nextIdx;
      const oldDeviation = element.minus(this.mean);

      this.sum = this.sum.plus(element);
      this.mean = this.mean.plus(oldDeviation.div(numElements + 1));

      const newDeviation = element.minus(this.mean);
      const deviationOfDeviation = (oldDeviation.times(newDeviation)).minus(this.variance);
      this.variance = this.variance.plus(deviationOfDeviation.div(numElements));
    }

    // insert element to list
    this.elements[this.nextIdx] = element;
    this.incIdx();
  }

  // returns the current element
  private currElement(): BigNumber {
    return this.elements[this.nextIdx];
  }

  // increments nextIdx
  private incIdx(): void {
    this.nextIdx = (this.nextIdx + 1) % this.windowSize;
  }
}