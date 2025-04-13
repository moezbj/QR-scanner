declare module 'react-qr-barcode-scanner' {
    import { ForwardRefExoticComponent, RefAttributes } from 'react';
    
    interface QrScannerProps {
      onUpdate: (error: Error | null, result: any) => void;
      onError?: (error: Error) => void;
      delay?: number;
      constraints?: MediaTrackConstraints;
      width:string;
      height:string
      facingMode:string
    }
  
    const QrScanner: ForwardRefExoticComponent<
      QrScannerProps & RefAttributes<HTMLDivElement>
    >;
    
    export default QrScanner;
  }