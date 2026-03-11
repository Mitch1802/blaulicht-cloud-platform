import { TestBed } from '@angular/core/testing';
import { EinsatzberichtComponent } from './einsatzbericht.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('EinsatzberichtComponent - parseBlaulichtAlarmtext', () => {
  let component: EinsatzberichtComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ EinsatzberichtComponent, HttpClientTestingModule, ReactiveFormsModule ]
    })
    .compileComponents();

    component = TestBed.createComponent(EinsatzberichtComponent).componentInstance;
  });

  it('should parse example 1 correctly', () => {
    const input = '(16:59) T1 Objekt/Baum - Umgestürzt. Weinbergstrasse 21, 2432 Schwadorf: Bäume auf Strasse (48.075, 16.5827)';
    const result = (component as any).parseBlaulichtAlarmtext(input);
    
    console.log('Example 1 Result:', result);
    expect(result.alarmstichwort).toBe('Objekt/Baum - Umgestürzt');
    expect(result.einsatzadresse).toContain('Weinbergstrasse 21');
    expect(result.einsatzadresse).toContain('2432 Schwadorf');
  });

  it('should parse example 2 correctly', () => {
    const input = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';
    const result = (component as any).parseBlaulichtAlarmtext(input);
    
    console.log('Example 2 Result:', result);
    expect(result.alarmstichwort).toBe('Bergung - PKW');
    expect(result.einsatzadresse).toContain('L2004 km 1.4');
  });

  it('should extract lageBeimEintreffen from text after colon', () => {
    const input = '(16:59) T1 Objekt/Baum - Umgestürzt. Weinbergstrasse 21, 2432 Schwadorf: Bäume auf Strasse (48.075, 16.5827)';
    const result = (component as any).parseBlaulichtAlarmtext(input);

    expect(result.lageBeimEintreffen).toContain('Bäume auf Strasse');
    expect(result.einsatzadresse).toContain('Weinbergstrasse 21');
  });

  it('should not extract lageBeimEintreffen when [BMA: is present', () => {
    const input = '(10:00) B2 BMA - Ausgelöst. Hauptstrasse 1, 2000 Wien: [BMA: Alarmzone 3] (48.2, 16.3)';
    const result = (component as any).parseBlaulichtAlarmtext(input);

    expect(result.lageBeimEintreffen).toBe('');
    expect(result.einsatzadresse).toContain('Hauptstrasse 1');
  });

  it('should return empty lageBeimEintreffen when no colon after address', () => {
    const input = '(12:16) T1 Bergung - PKW. L2004 km 1.4 (Schwadorf -> Rauchenwarth) (48.075, 16.5644)';
    const result = (component as any).parseBlaulichtAlarmtext(input);

    expect(result.lageBeimEintreffen).toBe('');
  });
});
