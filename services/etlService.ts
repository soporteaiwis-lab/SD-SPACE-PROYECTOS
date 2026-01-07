
export class ETLService {
  
  /**
   * Simple CSV Parser
   * Converts a CSV string into an array of objects.
   * Assumes the first row is the header.
   */
  async parseCSV(file: File): Promise<{ headers: string[], data: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r\n|\n/);
          
          if (lines.length < 2) {
             resolve({ headers: [], data: [] });
             return;
          }

          // Extract headers
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const data = [];

          for (let i = 1; i < lines.length; i++) {
             const line = lines[i].trim();
             if (!line) continue;
             
             // Handle quotes vaguely (simplified for browser speed)
             const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
             
             if (values.length === headers.length) {
                 const row: any = {};
                 headers.forEach((h, index) => {
                     row[h] = values[index];
                 });
                 data.push(row);
             }
          }
          resolve({ headers, data });
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject("Error reading file");
      reader.readAsText(file);
    });
  }

  /**
   * Remaps imported data based on a user-defined mapping
   * @param sourceData Array of objects from CSV
   * @param mapping Object where Key = DB Field, Value = CSV Header
   */
  transformData(sourceData: any[], mapping: { [dbField: string]: string }): any[] {
      return sourceData.map(row => {
          const newRow: any = {};
          // Only map fields that are defined in the mapping
          Object.keys(mapping).forEach(dbField => {
              const csvHeader = mapping[dbField];
              if (csvHeader && row[csvHeader] !== undefined) {
                  newRow[dbField] = row[csvHeader];
              }
          });
          
          // Generate ID if not mapped
          if (!newRow.id) {
              newRow.id = 'imported_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          }
          
          return newRow;
      });
  }
}

export const etl = new ETLService();
