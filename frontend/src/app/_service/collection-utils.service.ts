import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

type GenericObject = object;
type SelectItem = { pkid: string | number; kuerzel: string; name: string };

@Injectable({
  providedIn: 'root',
})
export class CollectionUtilsService {
  arraySortByKey<T extends GenericObject>(array: T[], key: keyof T | string): T[] {
    array.sort((a, b) => this.compareValues(this.readValue(a, String(key)), this.readValue(b, String(key))));
    return array;
  }

  arraySortByKeyDesc<T extends GenericObject>(array: T[], key: keyof T | string): T[] {
    array.sort((a, b) => this.compareValues(this.readValue(b, String(key)), this.readValue(a, String(key))));
    return array;
  }

  sucheArrayInArray<T extends GenericObject, U extends GenericObject>(gesamtArray: T[], teilArray: U[], vergleichKey: string): T[] {
    const arrayNeu: T[] = [];
    for (let i = 0; i < gesamtArray.length; i += 1) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x += 1) {
        const left = this.readValue(gesamtArray[i], vergleichKey);
        const right = this.readValue(teilArray[x], vergleichKey);
        if (left === right) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  sucheNumberArrayInObjectArray<T extends GenericObject>(gesamtArray: T[], teilArray: Array<string | number>, gesamtArrayKey: string): T[] {
    const arrayNeu: T[] = [];
    for (let i = 0; i < gesamtArray.length; i += 1) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x += 1) {
        if (this.readValue(gesamtArray[i], gesamtArrayKey) === teilArray[x]) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  vergleicheZweiArrays<T extends GenericObject>(array1: T[], array2: T[], vergleichKey: string): T[] {
    const arrayNeu = array1;
    for (let i = 0; i < array2.length; i += 1) {
      let count = 0;
      for (let x = 0; x < arrayNeu.length; x += 1) {
        if (this.readValue(array2[i], vergleichKey) === this.readValue(arrayNeu[x], vergleichKey)) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(array2[i]);
      }
    }
    return arrayNeu;
  }

  addItemFromSelectToList(control: AbstractControl, arrayGesamt: SelectItem[], array: SelectItem[]): void {
    const selectedId = control.value;
    if (selectedId !== '0') {
      if (array.length > 0) {
        let count = 0;
        for (let i = 0; i < array.length; i += 1) {
          if (selectedId === array[i].pkid) {
            count += 1;
          }
        }
        if (count === 0) {
          for (let i = 0; i < arrayGesamt.length; i += 1) {
            if (selectedId === arrayGesamt[i].pkid) {
              array.push({
                pkid: arrayGesamt[i].pkid,
                kuerzel: arrayGesamt[i].kuerzel,
                name: arrayGesamt[i].name,
              });
              arrayGesamt.splice(i, 1);
            }
          }
        }
      } else {
        for (let i = 0; i < arrayGesamt.length; i += 1) {
          if (selectedId === arrayGesamt[i].pkid) {
            array.push({
              pkid: arrayGesamt[i].pkid,
              kuerzel: arrayGesamt[i].kuerzel,
              name: arrayGesamt[i].name,
            });
            arrayGesamt.splice(i, 1);
          }
        }
      }

      control.setValue(0, { onlySelf: true });
      this.arraySortByKey(array, 'kuerzel');
    }
  }

  addItemFromListToSelect(pkid: string | number, arrayGesamt: SelectItem[], array: SelectItem[]): void {
    for (let i = 0; i < array.length; i += 1) {
      if (pkid === array[i].pkid) {
        arrayGesamt.push({ pkid: array[i].pkid, kuerzel: array[i].kuerzel, name: array[i].name });
        array.splice(i, 1);
      }
    }
    this.arraySortByKey(arrayGesamt, 'kuerzel');
  }

  addFeldInArray<T extends GenericObject>(arrayGesamt: T[], array: T[], feldName: string, joinKey: string): T[] {
    const map = new Map(arrayGesamt.map((item) => [this.readValue(item, joinKey), this.readValue(item, feldName)]));

    return array.map((item) => {
      const key = this.readValue(item, joinKey);
      if (map.has(key)) {
        return { ...(item as Record<string, unknown>), [feldName]: map.get(key) } as T;
      }
      return item;
    });
  }

  addAllFieldsToNumberArray<T extends GenericObject>(arrayGesamt: T[], array: Array<string | number>): T[] {
    const dataNew: T[] = [];
    for (let i = 0; i < array.length; i += 1) {
      const pkid = array[i];
      for (let x = 0; x < arrayGesamt.length; x += 1) {
        if (pkid === this.readValue(arrayGesamt[x], 'pkid')) {
          dataNew.push(arrayGesamt[x]);
        }
      }
    }

    return dataNew;
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) {
      return 0;
    }

    const left = typeof a === 'number' ? a : String(a ?? '');
    const right = typeof b === 'number' ? b : String(b ?? '');

    return left > right ? 1 : -1;
  }

  private readValue(item: unknown, key: string): unknown {
    if (!item || typeof item !== 'object') {
      return undefined;
    }
    return (item as Record<string, unknown>)[key];
  }
}

