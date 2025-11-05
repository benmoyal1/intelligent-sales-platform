import dotenv from 'dotenv';
dotenv.config();

import { db } from './database';
import { v4 as uuidv4 } from 'uuid';

const PHONE_NUMBER = '+972525703444';

// Sample data for generating varied prospects
const firstNames = [
  'David', 'Sarah', 'Michael', 'Rachel', 'Daniel', 'Tamar', 'Yosef', 'Rivka', 'Aaron', 'Leah',
  'Benjamin', 'Hannah', 'Eli', 'Miriam', 'Jacob', 'Esther', 'Isaac', 'Ruth', 'Samuel', 'Naomi',
  'Jonathan', 'Rebecca', 'Nathan', 'Deborah', 'Adam', 'Judith', 'Ethan', 'Maya', 'Noah', 'Shira',
  'Levi', 'Avigail', 'Gideon', 'Yael', 'Asher', 'Noa', 'Reuben', 'Talia', 'Simon', 'Ayelet',
  'Caleb', 'Orly', 'Joshua', 'Dana', 'Avi', 'Shani', 'Moshe', 'Liora', 'Yair', 'Hila'
];

const lastNames = [
  'Cohen', 'Levy', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Avraham', 'Friedman', 'Azulay', 'Katz',
  'Malka', 'Ohayon', 'Eliyahu', 'Yaakov', 'David', 'Gabay', 'Shapiro', 'Goldstein', 'Rosenberg', 'Klein',
  'Weiss', 'Fischer', 'Schwartz', 'Gross', 'Stein', 'Hoffman', 'Berg', 'Wolf', 'Goldberg', 'Silver',
  'Diamond', 'Pearl', 'Star', 'Moon', 'Sun', 'Stone', 'Forest', 'River', 'Mountain', 'Valley'
];

const companies = [
  'Tech Solutions Ltd', 'Innovation Hub', 'Digital Dynamics', 'Smart Systems', 'Cloud First',
  'Data Insights Co', 'AI Ventures', 'Cyber Secure', 'Mobile Apps Inc', 'Web Innovations',
  'Software House', 'IT Consulting Group', 'Enterprise Solutions', 'Startup Accelerator', 'Tech Park',
  'Code Factory', 'Digital Transform', 'Platform Pro', 'Systems Integration', 'Network Plus',
  'Cloud Services', 'Data Analytics Ltd', 'Security Solutions', 'App Development Co', 'Tech Experts',
  'Innovation Labs', 'Digital Agency', 'IT Solutions', 'Software Consulting', 'Tech Advisors'
];

const roles = [
  'CEO', 'CTO', 'VP of Sales', 'VP of Marketing', 'VP of Operations', 'CFO', 'COO',
  'Head of IT', 'Head of Sales', 'Head of Marketing', 'Director of Operations', 'IT Director',
  'Sales Director', 'Marketing Director', 'Business Development Manager', 'Product Manager',
  'Technology Lead', 'Engineering Manager', 'Sales Manager', 'Marketing Manager'
];

const industries = [
  'Technology', 'SaaS', 'FinTech', 'E-commerce', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Consulting', 'Media', 'Telecommunications', 'Cybersecurity', 'AI & Machine Learning',
  'Cloud Computing', 'Mobile Development', 'Enterprise Software', 'Digital Marketing'
];

const companySizes = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateProspects(count: number) {
  console.log(`Generating ${count} prospects...`);

  const now = new Date().toISOString();
  let successCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const id = uuidv4();
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const name = `${firstName} ${lastName}`;
      const company = getRandomElement(companies);
      const role = getRandomElement(roles);
      const industry = getRandomElement(industries);
      const companySize = getRandomElement(companySizes);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`;

      db.prepare(`
        INSERT INTO prospects (
          id, name, email, phone, company, role, industry, company_size,
          custom_instructions, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
      `).run(
        id,
        name,
        email,
        PHONE_NUMBER,
        company,
        role,
        industry,
        companySize.toString(),
        null,
        now
      );

      successCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`✓ Created ${i + 1} prospects...`);
      }
    } catch (error) {
      console.error(`Error creating prospect ${i + 1}:`, error);
    }
  }

  console.log(`\n✅ Successfully created ${successCount} out of ${count} prospects`);
  console.log(`📞 All prospects use phone number: ${PHONE_NUMBER}`);
}

// Run the seed script
try {
  generateProspects(100);
  console.log('\n🎉 Seed script completed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
}
