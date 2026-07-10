// تهيئة Firebase




const firebaseConfig = {
  apiKey: "AIzaSyDItPfiy7VZNHgjTSdvggw9iZgDKxNPQOo",
  authDomain: "logg-d33e6.firebaseapp.com",
  databaseURL: "https://logg-d33e6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "logg-d33e6",
  storageBucket: "logg-d33e6.firebasestorage.app",
  messagingSenderId: "815537285421",
  appId: "1:815537285421:web:196f7fa2061dfcaacbcba4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// تنفيذ بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تعيين سنة حقوق النشر
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // القائمة المتنقلة للجوال
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // تأثير التمرير للنافبار
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // زر التمرير للأسفل
    const scrollDown = document.querySelector('.hero-scroll');
    if (scrollDown) {
        scrollDown.addEventListener('click', function() {
            window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
            });
        });
    }
    
    // تحديد الصفوف بناءً على المرحلة الدراسية
    const educationLevel = document.getElementById('educationLevel');
    if (educationLevel) {
        educationLevel.addEventListener('change', function() {
            const gradeSelect = document.getElementById('grade');
            gradeSelect.innerHTML = '<option value="">اختر الصف الدراسي</option>';
            
            if (this.value === 'primary') {
                for (let i = 1; i <= 6; i++) {
                    const option = document.createElement('option');
                    option.value = `primary_${i}`;
                    option.textContent = `الصف ${i} الابتدائي`;
                    gradeSelect.appendChild(option);
                }
            } else if (this.value === 'preparatory') {
                for (let i = 1; i <= 3; i++) {
                    const option = document.createElement('option');
                    option.value = `preparatory_${i}`;
                    option.textContent = `الصف ${i} الإعدادي`;
                    gradeSelect.appendChild(option);
                }
            }
        });
    }
    
    // تعطيل التواريخ الماضية في حقل التاريخ
    const bookingDate = document.getElementById('bookingDate');
    if (bookingDate) {
        const today = new Date().toISOString().split('T')[0];
        bookingDate.setAttribute('min', today);
    }
    
    // نموذج الحجز متعدد الخطوات
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        const formSections = document.querySelectorAll('.form-section');
        const steps = document.querySelectorAll('.step');
        let currentSection = 0;
        
        // عرض القسم الأول
        showSection(currentSection);
        
        // زر التالي
        const nextButtons = document.querySelectorAll('.next-btn');
        nextButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (validateSection(currentSection)) {
                    currentSection++;
                    showSection(currentSection);
                    updateSteps(currentSection);
                    updateSummary();
                }
            });
        });
        
        // زر السابق
        const prevButtons = document.querySelectorAll('.prev-btn');
        prevButtons.forEach(button => {
            button.addEventListener('click', function() {
                currentSection--;
                showSection(currentSection);
                updateSteps(currentSection);
            });
        });
        
        // معالجة إرسال النموذج
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateSection(currentSection)) {
                const formData = {
                    studentName: this.studentName.value,
                    parentName: this.parentName.value,
                    parentPhone: this.parentPhone.value,
                    studentEmail: this.studentEmail.value || 'غير مدخل',
                    educationLevel: this.educationLevel.value,
                    grade: this.grade.options[this.grade.selectedIndex].text,
                    bookingDate: this.bookingDate.value,
                    bookingTime: this.bookingTime.options[this.bookingTime.selectedIndex].text,
                   
                    notes: this.notes.value || 'لا يوجد',
                    timestamp: new Date().toISOString()
                };
                
                // إرسال البيانات إلى Firebase
                const newBookingRef = database.ref('bookings').push();
                newBookingRef.set(formData)
                    .then(() => {
                        // عرض رسالة نجاح
                        alert('تم حجز الدرس بنجاح! سنتصل بك لتأكيد الموعد.');
                        
                        // إعادة تعيين النموذج
                        this.reset();
                        
                        // العودة إلى القسم الأول
                        currentSection = 0;
                        showSection(currentSection);
                        updateSteps(currentSection);
                    })
                    .catch((error) => {
                        console.error('Error saving booking:', error);
                        alert('حدث خطأ أثناء محاولة الحجز. يرجى المحاولة مرة أخرى.');
                    });
            }
        });
        
        // عرض القسم المحدد
        function showSection(index) {
            formSections.forEach((section, i) => {
                section.classList.toggle('active', i === index);
            });
            
            // إخفاء/إظهار أزرار السابق والتالي
            const prevButtons = document.querySelectorAll('.prev-btn');
            const nextButtons = document.querySelectorAll('.next-btn');
            
            if (index === 0) {
                prevButtons.forEach(btn => btn.style.display = 'none');
            } else {
                prevButtons.forEach(btn => btn.style.display = 'block');
            }
            
            if (index === formSections.length - 1) {
                nextButtons.forEach(btn => btn.style.display = 'none');
            } else {
                nextButtons.forEach(btn => btn.style.display = 'block');
            }
        }
        
        // تحديث خطوات التقدم
        function updateSteps(index) {
            steps.forEach((step, i) => {
                step.classList.toggle('active', i <= index);
            });
        }
        
        // التحقق من صحة القسم
        function validateSection(index) {
            const currentSection = formSections[index];
            const inputs = currentSection.querySelectorAll('input[required], select[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.style.borderColor = 'var(--danger-color)';
                    isValid = false;
                    
                    // إضافة رسالة خطأ
                    if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('error-message')) {
                        const errorMsg = document.createElement('span');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'هذا الحقل مطلوب';
                        errorMsg.style.color = 'var(--danger-color)';
                        errorMsg.style.fontSize = '0.8rem';
                        errorMsg.style.marginTop = '0.3rem';
                        errorMsg.style.display = 'block';
                        input.parentNode.insertBefore(errorMsg, input.nextSibling);
                    }
                } else {
                    input.style.borderColor = '#dee2e6';
                    const errorMsg = input.nextElementSibling;
                    if (errorMsg && errorMsg.classList.contains('error-message')) {
                        errorMsg.remove();
                    }
                }
            });
            
            return isValid;
        }
        
        // تحديث ملخص الحجز
        function updateSummary() {
            const form = document.getElementById('bookingForm');
            if (!form) return;
            
            document.getElementById('summary-studentName').textContent = form.studentName.value;
            document.getElementById('summary-parentName').textContent = form.parentName.value;
            document.getElementById('summary-parentPhone').textContent = form.parentPhone.value;
            document.getElementById('summary-grade').textContent = form.grade.options[form.grade.selectedIndex].text;
            document.getElementById('summary-bookingDate').textContent = form.bookingDate.value;
            document.getElementById('summary-bookingTime').textContent = form.bookingTime.options[form.bookingTime.selectedIndex].text;
            document.getElementById('summary-lessonType').textContent = form.lessonType.options[form.lessonType.selectedIndex].text;
        }
    }
    
    // اختبار اتصال Firebase (للتأكد من أن الإعدادات صحيحة)
    function testFirebaseConnection() {
        const testRef = database.ref('testConnection');
        testRef.set({
            message: "Testing Firebase connection",
            timestamp: new Date().toISOString()
        })
        .then(() => console.log("Firebase connection is working"))
        .catch(error => console.error("Firebase connection error:", error));
    }
    
    // يمكنك استدعاء هذه الدالة للتأكد من أن Firebase يعمل
    // testFirebaseConnection();
});