import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class CollectionUtilsService {
  arraySortByKey(array: any[], key: any): any[] {
    array.sort((a: any, b: any) => (a[key] === b[key] ? 0 : +(a[key] > b[key]) || -1));
    return array;
  }

  arraySortByKeyDesc(array: any[], key: any): any[] {
    array.sort((a: any, b: any) => (a[key] === b[key] ? 0 : +(a[key] < b[key]) || -1));
    return array;
  }

  sucheArrayInArray(gesamtArray: any[], teilArray: any[], vergleichKey: string): any[] {
    const arrayNeu = [];
    for (let i = 0; i < gesamtArray.length; i += 1) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x += 1) {
        if (gesamtArray[i][vergleichKey] === teilArray[x][vergleichKey]) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  sucheNumberArrayInObjectArray(gesamtArray: any[], teilArray: any[], gesamtArrayKey: string): any[] {
    const arrayNeu = [];
    for (let i = 0; i < gesamtArray.length; i += 1) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x += 1) {
        if (gesamtArray[i][gesamtArrayKey] === teilArray[x]) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  vergleicheZweiArrays(array1: any[], array2: any[], vergleichKey: string): any[] {
    const arrayNeu = array1;
    for (let i = 0; i < array2.length; i += 1) {
      let count = 0;
      for (let x = 0; x < arrayNeu.length; x += 1) {
        if (array2[i][vergleichKey] === arrayNeu[x][vergleichKey]) {
          count += 1;
        }
      }
      if (count === 0) {
        arrayNeu.push(array2[i]);
      }
    }
    return arrayNeu;
  }

  addItemFromSelectToList(control: AbstractControl, arrayGesamt: any[], array: any[]): void {
    const selectedId = control.value;
    if (selectedId !== '0') {
      if (array.length > 0) {
        let count = 0;
        for (let i = 0; i < array.length; i += 1) {
          if (selectedId === array[i]) {
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

  addItemFromListToSelect(pkid: string, arrayGesamt: any[], array: any[]): void {
    for (let i = 0; i < array.length; i += 1) {
      if (pkid === array[i].pkid) {
        arrayGesamt.push({ pkid: array[i].pkid, kuerzel: array[i].kuerzel, name: array[i].name });
        array.splice(i, 1);
      }
    }
    this.arraySortByKey(arrayGesamt, 'kuerzel');
  }

  addFeldInArray(arrayGesamt: any[], array: any[], feldName: string, joinKey: string): any[] {
    const map = new Map(arrayGesamt.map((item) => [item[joinKey], item[feldName]]));

    return array.map((item) => {
      const key = item[joinKey];
      if (map.has(key)) {
        return { ...item, [feldName]: map.get(key) };
      }
      return item;
    });
  }

  addAllFieldsToNumberArray(arrayGesamt: any[], array: any[]): any[] {
    const dataNew = [];
    for (let i = 0; i < array.length; i += 1) {
      const pkid = array[i];
      for (let x = 0; x < arrayGesamt.length; x += 1) {
        if (pkid === arrayGesamt[x].pkid) {
          dataNew.push(arrayGesamt[x]);
        }
      }
    }

    return dataNew;
  }
}
