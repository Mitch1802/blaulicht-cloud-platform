import { TestBed } from '@angular/core/testing';
import { EinsatzberichtComponent } from './einsatzbericht.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('EinsatzberichtComponent - parseBlaulichtAlarmtext', () => {
  let component: EinsatzberichtComponent;
  type ParsedAlarm = {
    einsatzart: string;
    alarmstichwort: string;
    einsatzadresse: string;
    lageBeimEintreffen: string;
    bmaMeldergruppe: string;
    bmaMelder: string;
  };

  const parseAlarm = (input: string): ParsedAlarm => {
    const parser = component as unknown as {
      parseBlaulichtAlarmtext: (value: string) => ParsedAlarm;
    };
    return parser.parseBlaulichtAlarmtext(input);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ EinsatzberichtComponent, HttpClientTestingModule, ReactiveFormsModule ]
    })
    .compileComponents();

    component = TestBed.createComponent(EinsatzberichtComponent).componentInstance;
  });

  it('should parse example 1 correctly', () => {
    const input = '(16:59) T1 Objekt/Baum - Umgestürzt. Weinbergstrasse 21, 2432 Schwadorf: Bäume auf Strasse (48.075, 16.5827)';
    const result = parseAlarm(input);

    expect(result.alarmstichwort).toBe('T1 Objekt/Baum - Umgestürzt');
    expect(result.einsatzadresse).toContain('Weinbergstrasse 21');
    expect(result.einsatzadresse).toContain('2432 Schwadorf');
  });

  it('should parse example 2 correctly', () => {
    const input = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';
    const result = parseAlarm(input);

    expect(result.alarmstichwort).toBe('T1 Bergung - PKW');
    expect(result.einsatzadresse).toContain('L2004 km 1.4');
  });

  it('should extract lageBeimEintreffen from text after colon', () => {
    const input = '(16:59) T1 Objekt/Baum - Umgestürzt. Weinbergstrasse 21, 2432 Schwadorf: Bäume auf Strasse (48.075, 16.5827)';
    const result = parseAlarm(input);

    expect(result.lageBeimEintreffen).toContain('Bäume auf Strasse');
    expect(result.einsatzadresse).toContain('Weinbergstrasse 21');
  });

  it('should not extract lageBeimEintreffen when [BMA: is present', () => {
    const input = '(10:00) B2 BMA - Ausgelöst. Hauptstrasse 1, 2000 Wien: [BMA: Alarmzone 3] (48.2, 16.3)';
    const result = parseAlarm(input);

    expect(result.lageBeimEintreffen).toBe('');
    expect(result.einsatzadresse).toContain('Hauptstrasse 1');
  });

  it('should extract bmaMeldergruppe and bmaMelder from [BMA: X-Y] pattern', () => {
    const input = '(10:00) B2 BMA - Ausgelöst. Hauptstrasse 1, 2000 Wien: [BMA: 5-32] (48.2, 16.3)';
    const result = parseAlarm(input);

    expect(result.bmaMeldergruppe).toBe('5');
    expect(result.bmaMelder).toBe('32');
  });

  it('should extract bmaMeldergruppe and bmaMelder with alphanumeric values', () => {
    const input = '(10:00) B2 BMA - Ausgelöst. Teststrasse 5, 1010 Wien: [BMA: A12-031] (48.2, 16.3)';
    const result = parseAlarm(input);

    expect(result.bmaMeldergruppe).toBe('A12');
    expect(result.bmaMelder).toBe('031');
  });

  it('should return empty bmaMeldergruppe and bmaMelder when no BMA pattern present', () => {
    const input = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';
    const result = parseAlarm(input);

    expect(result.bmaMeldergruppe).toBe('');
    expect(result.bmaMelder).toBe('');
  });

  it('should return empty lageBeimEintreffen when no colon after address', () => {
    const input = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';
    const result = parseAlarm(input);

    expect(result.lageBeimEintreffen).toBe('');
  });

  it('should derive einsatzart only from final alarmstichwort and ignore later alarm text', () => {
    const input = '(12:16) T1 Tueroeffnung. Hauptstrasse 1, 2000 Wien: BMA wurde vom Betreiber bestaetigt';
    const result = parseAlarm(input);

    expect(result.alarmstichwort).toBe('T1 Tueroeffnung');
    expect(result.einsatzart).toBe('Technischer Einsatz');
  });
});
