import { InputElement, OutputElement, InputSourceType, OutputDisplayType } from './logic-gates.model';
import { Pin, Position } from './base.model';

export class SwitchInput implements InputElement {
  public readonly id: string;
  public type: 'INPUT' = 'INPUT';
  public sourceType: InputSourceType = 'SWITCH';
  
  public inputs: Pin[] = [];
  public outputs: Pin[] = [];
  public position?: Position;

  // The switch output logic representation
  private state: '0' | '1' = '0';

  constructor(id?: string, position?: Position) {
    this.id = id || crypto.randomUUID();
    this.position = position;
    
    // Switch outputs its state to a single pin
    this.outputs = [{
      id: crypto.randomUUID(),
      name: 'OUT',
      direction: 'OUT',
      value: this.state,
      elementId: this.id
    }];
  }

  public evaluate(): void {
    // Evaluation for input is simple: we push the current state to the output pin
    this.outputs[0].value = this.state;
  }

  public toggle(): void {
    this.state = this.state === '0' ? '1' : '0';
    // Optionally trigger evaluate here, but the engine should handle this on tick
    this.outputs[0].value = this.state;
  }
}

export class LedOutput implements OutputElement {
  public readonly id: string;
  public type: 'OUTPUT' = 'OUTPUT';
  public displayType: OutputDisplayType = 'LED';
  
  public inputs: Pin[] = [];
  public outputs: Pin[] = [];
  public position?: Position;

  // Holds the current state to be read by the UI
  public colorState: '0' | '1' | 'X' | 'Z' = 'X';

  constructor(id?: string, position?: Position) {
    this.id = id || crypto.randomUUID();
    this.position = position;
    
    // LED has a single input pin
    this.inputs = [{
      id: crypto.randomUUID(),
      name: 'IN',
      direction: 'IN',
      value: 'X',
      elementId: this.id
    }];
  }

  public evaluate(): void {
    // Reads from input pin and sets color state
    this.colorState = this.inputs[0].value;
  }
}
